# 🔐 Login Credentials Format Guide

This guide details the structure and schema required for credentials inside the `credentials/login_credentials.json` file. This file acts as a local credential backup and seed file for Firebase.

> [!WARNING]
> JSON files do **NOT** support JavaScript-style comments (like `//` or `/*`). 
> Always ensure your JSON is syntactically valid to prevent application parsing errors.

---

## 📋 Schema Fields Description

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `username` | `string` | Unique login identifier (lowercase recommended). |
| `password` | `string` | Secure login password. |
| `role` | `string` | Must be one of: `"super_admin"`, `"main_admin"`, or `"user"`. |
| `dataFile` | `string` | Storage subdirectory/scope (e.g. `"clients"`, `"personal"`). **Only used for `"user"` role.** |
| `description` | `string` | Helpful note or description for this login account. |
| `isUnlimited` | `boolean` | Set to `true` for infinity profile creation limits. |
| `maxUsers` | `number \| null` | Maximum profile limit. Must be set to `null` if `isUnlimited` is `true`. |
| `isActive` | `boolean` | Set to `true` to enable login capability. |
| `isFrozen` | `boolean` | Read-only setting. If `true`, the user cannot add/edit profiles. |
| `profileCount` | `number` | Synchronized real-time profile count. |
| `createdAt` | `string` | ISO datetime string representing account creation time. |

---

## 💻 Valid JSON Example Template

```json
[
  {
    "username": "main",
    "password": "supersecretpassword",
    "role": "super_admin",
    "dataFile": "",
    "description": "Super administrator with access to all users across all files",
    "isUnlimited": true,
    "maxUsers": null,
    "isActive": true,
    "isFrozen": false,
    "profileCount": 0,
    "createdAt": "2026-05-19T12:00:00.000Z"
  },
  {
    "username": "admin",
    "password": "adminpassword",
    "role": "main_admin",
    "dataFile": "",
    "description": "Main administrator with full access to client lists",
    "isUnlimited": true,
    "maxUsers": null,
    "isActive": true,
    "isFrozen": false,
    "profileCount": 0,
    "createdAt": "2026-05-19T12:00:00.000Z"
  },
  {
    "username": "demo",
    "password": "demopassword",
    "role": "user",
    "dataFile": "demo",
    "description": "General clients account linked to demo profile scope",
    "isUnlimited": false,
    "maxUsers": 10,
    "isActive": true,
    "isFrozen": false,
    "profileCount": 5,
    "createdAt": "2026-05-19T12:00:00.000Z"
  }
]
```
