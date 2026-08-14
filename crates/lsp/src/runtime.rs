#[cfg(feature = "linux")]
pub type CoodiAppHandle = tauri::AppHandle<tauri::Cef>;

#[cfg(not(feature = "linux"))]
pub type CoodiAppHandle = tauri::AppHandle<tauri::Wry>;
