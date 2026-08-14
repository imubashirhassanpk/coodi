#[cfg(feature = "linux")]
pub type CoodiRuntime = tauri::Cef;

#[cfg(not(feature = "linux"))]
pub type CoodiRuntime = tauri::Wry;

pub type AppHandle = tauri::AppHandle<CoodiRuntime>;
