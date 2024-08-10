# Nomnom's Unity Hub

## Features

- Written in React + Tauri + Rust
- Paginated project list
- Project creation
  - Select a template to start from, or start from scratch
  - Select the specific packages you want
    - Supports internal packages
    - Supports git packages
    - Supports local file packages
  - Select the files/folders you want from the template
  - Can override the template's internal project entirely
- Template creation
  - Integrated into the project creation
  - The final template file will also be discoverable by the Unity Hub
- Editor version list
  - Can see how large each version's disk size is
  - Can open a version's changelog
  - Can open the version's folder on disk
  - Can see what modules are installed

## Building

```bash
# move into src folder
cd .\src\

# if npm
npm run tauri build

# if pnpm
pnpm tauri build
```

Then find the exe in `\src-tauri\target\release\`
