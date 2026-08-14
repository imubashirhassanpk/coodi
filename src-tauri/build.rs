fn main() {
   if std::env::var_os("CARGO_FEATURE_LINUX").is_some()
      && std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("linux")
   {
      println!("cargo:rustc-link-arg-bin=coodi=-Wl,-rpath,$ORIGIN");
      println!("cargo:rustc-link-arg-bin=coodi=-Wl,-rpath,$ORIGIN/../lib/Coodi");
      println!("cargo:rustc-link-arg-bin=coodi=-Wl,-rpath,$ORIGIN/../lib/Coodi Preview");
   }

   tauri_build::build()
}
