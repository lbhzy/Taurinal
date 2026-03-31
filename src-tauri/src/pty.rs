use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::collections::HashMap;
use std::io::Write;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

pub struct PtyState {
    writers: Mutex<HashMap<u32, Box<dyn Write + Send>>>,
    masters: Mutex<HashMap<u32, Box<dyn MasterPty + Send>>>,
    next_id: Mutex<u32>,
}

impl PtyState {
    pub fn new() -> Self {
        Self {
            writers: Mutex::new(HashMap::new()),
            masters: Mutex::new(HashMap::new()),
            next_id: Mutex::new(1),
        }
    }
}

#[tauri::command]
pub fn pty_spawn(
    app: AppHandle,
    state: tauri::State<'_, PtyState>,
    rows: u16,
    cols: u16,
) -> Result<u32, String> {
    let pty_system = native_pty_system();

    let pair = pty_system
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let cmd = CommandBuilder::new_default_prog();

    let mut child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    // Release the slave side — the child process owns it now
    drop(pair.slave);

    let id = {
        let mut next_id = state.next_id.lock().unwrap();
        let id = *next_id;
        *next_id += 1;
        id
    };

    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;
    let reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    {
        let mut writers = state.writers.lock().unwrap();
        writers.insert(id, writer);
    }
    {
        let mut masters = state.masters.lock().unwrap();
        masters.insert(id, pair.master);
    }

    // Spawn reader thread — reads from PTY master and emits events to frontend
    let app_handle = app.clone();
    let pty_id = id;
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        let mut reader = reader;
        loop {
            match std::io::Read::read(&mut reader, &mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app_handle.emit(&format!("pty-output-{}", pty_id), data);
                }
                Err(_) => break,
            }
        }
        let _ = app_handle.emit(&format!("pty-exit-{}", pty_id), ());
    });

    // Spawn thread to wait for child exit
    std::thread::spawn(move || {
        let _ = child.wait();
    });

    Ok(id)
}

#[tauri::command]
pub fn pty_write(state: tauri::State<'_, PtyState>, id: u32, data: String) -> Result<(), String> {
    let mut writers = state.writers.lock().unwrap();
    if let Some(writer) = writers.get_mut(&id) {
        writer
            .write_all(data.as_bytes())
            .map_err(|e| e.to_string())?;
        writer.flush().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err(format!("PTY {} not found", id))
    }
}

#[tauri::command]
pub fn pty_resize(
    state: tauri::State<'_, PtyState>,
    id: u32,
    rows: u16,
    cols: u16,
) -> Result<(), String> {
    let masters = state.masters.lock().unwrap();
    if let Some(master) = masters.get(&id) {
        master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err(format!("PTY {} not found", id))
    }
}
