# Windows-first release checklist

- [x] Narrow the installer workflow to Windows NSIS only for the current release.
- [x] Update release metadata and website download messaging for Windows-first publication.
- [x] Run the Windows build and verify the NSIS executable artifact through the alternate repository after the original runner blocker.
- [x] Check GitHub Actions runner availability and publish the Windows release when the workflow succeeds. Published successfully from the alternate repository after runner access was restored there.
- [x] Leave macOS installer work explicitly deferred to a later release.

- [x] Confirm the alternate GitHub account, repository destination, and Actions permissions.
- [x] Configure the Windows-only workflow for the approved alternate destination.
- [x] Build and verify the Windows NSIS installer, then publish only after artifact validation.
- [x] Update the original Coodi website download URL to the verified Windows release asset.

- [x] Diagnose the Windows settings dialog scroll-container failure and ensure all settings tabs can scroll.
- [x] Ensure provider, model, and API-key controls remain reachable and usable at the bottom of AI settings.
- [x] Inspect and repair the Windows application, executable, and shortcut icon configuration.
- [x] Run focused tests and Windows packaging validation for the desktop fixes.
- [ ] Commit and push the verified desktop fixes to the Coodi GitHub repository.
- [ ] Build, inspect, and publish a Windows-only patch installer containing the verified settings and icon fixes. Deferred for this task at the user's request.
- [x] Document the localhost Windows NSIS `.exe` installer build and prompt-based verification workflow in the README.
- [x] Validate and push the README documentation update to both Coodi repositories.
- [x] Replace the GitHub README header logo with the Coodi C-mark asset.
- [x] Add a standalone Hostinger Node.js-ready website source folder to the Coodi GitHub repository.
- [ ] Commit and push the standalone `website-hostinger` source, C-mark README logo, and README deployment link to GitHub.
- [ ] Verify the remote Coodi repository contains the Hostinger source folder and deployment guide.
- [x] Document the local macOS DMG build commands, architecture options, signing caveats, and output paths in the README.
- [x] Add copy-paste Windows and macOS build prompts for Cursor, Claude, Grok, and similar coding assistants.
