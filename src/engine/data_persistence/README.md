<!-- HIERARCHY_START -->
[Nitrate](../README.md) / DataPersistence
<!-- HIERARCHY_END -->

# Data Persistence
App-lifetime save slot management — reads and writes binary data to disk.

Provides a slot-aware file I/O layer used by world streaming and any other system that needs to persist state across sessions.

<!-- API_START -->
---

## API

### [`DataPersistenceManager`](DataPersistenceManager.ts)
 Central router for all disk persistence. Manages save slots and provides read/write access to the active slot.

| Method | Description |
|--------|-------------|
| [`async CreateNewSlot(): Promise<void>`](DataPersistenceManager.ts) | Finds the next unused slot and switches to it. Call explicitly for New Game. |
| [`async WriteFile(relativePath: string, data: ArrayBuffer, compress = true): Promise<void>`](DataPersistenceManager.ts) | Writes a binary file to the active save slot at the given relative path. |
| [`async ReadFile(relativePath: string, compress = true): Promise<ArrayBuffer \| null>`](DataPersistenceManager.ts) | Reads a binary file from the active save slot at the given relative path. Returns null if not found. |
| [`async FileExists(relativePath: string): Promise<boolean>`](DataPersistenceManager.ts) | Returns true if a file exists at the given relative path within the active save slot. |
| [`async DeleteFile(relativePath: string): Promise<void>`](DataPersistenceManager.ts) | Deletes a file at the given relative path within the active save slot. |
| [`async DeleteSave(): Promise<void>`](DataPersistenceManager.ts) | Deletes the entire active save slot directory from disk. |

---

### [`ScreenshotManager`](ScreenshotManager.ts)
 Captures a screenshot of the app as a PNG and writes it to the Screenshots directory.


---

<!-- API_END -->