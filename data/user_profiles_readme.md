# 📂 User Profiles Data Format Guide

This guide details the structure and schema required for user profile files inside subdirectories within the `data/` folder (such as `data/clients-1/client.json` or `data/clients-2/profile.json`).

These files serve as local database seeds, offline backups, or default templates for individual landing pages (QR code links).

---

## 📋 Core Profile Fields

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `username` | `string` | The parent login account username this profile belongs to (e.g. `"clients"`). |
| `fullname` | `string` | The public display name/title of the profile page (e.g. `"Barbarous Unisex Saloon"`). |
| `userCode` | `string` | Unique slug code for URLs (`.../view.html?c=userCode`). |
| `createdAt` | `string` | ISO datetime string representing the profile's creation time. |
| `description` | `string` | Internal administrator notes about this profile. |
| `publicDescription` | `string` | Public subtitle or bio displayed below the name on the landing page. |

---

## 🔗 Platform Link Keys

Profiles support over **175+ platforms**. Adding any of these keys with a valid URL or detail automatically displays active badges on the admin card and beautiful animated buttons on the public profile page.

### 🌟 Common Platform Keys by Category

#### 💼 Professional & Business
- `linkedin`
- `xing`
- `angellist`
- `meetup`
- `opportunity`
- `portfolio`

#### 🎨 Creative & Design
- `behance`
- `dribbble`
- `figma`
- `artstation`
- `zerply`

#### 📣 Social Media
- `instagram`
- `twitter`
- `facebook`
- `threads`
- `mastodon`
- `bluesky`
- `pinterest`
- `reddit`
- `snapchat`
- `tumblr`

#### 💬 Messaging & Contact
- `whatsapp`
- `telegram`
- `discord`
- `signal`
- `skype`
- `slack`
- `wechat`
- `line`
- `messenger`
- `email`
- `phone`
- `website`
- `location` (Google Maps URL)

#### 💳 Payments & UPI
- `upi`
- `gpay`
- `phonepe`
- `paytm`
- `paypal`
- `cashapp`
- `razorpay`
- `cred`
- `bhim`
- `amazonpay`

#### 🛍️ E-Commerce & Food Delivery
- `swiggy`
- `zomato`
- `dineout`
- `swiggyinstamart`
- `dunzo`
- `jiomart`
- `amazon`
- `shopify`
- `flipkart`
- `meesho`
- `nykaa`

---

## 💻 Valid JSON Example

```json
[
  {
    "username": "XYZ_Cafe",
    "fullname": "XYZ Cafe",
    "publicDescription": "The best brew in town since 2018.",
    "userCode": "XXXXXXXX",
    "createdAt": "2026-05-19T14:00:00.000Z",
    "description": "Premium coffee shop",
    "instagram": "https://instagram.com/XYZcafe",
    "whatsapp": "XXXXXXXXXX",
    "phone": "XXXXXXXXXX",
    "website": "https://XYZcafe.com",
    "location": "https://maps.google.com/?q=XYZ+Cafe",
    "menucard": "https://XYZcafe.com/menu.pdf"
  }
]
```

---

## ⚡ The System Index File (`data/index.json`)

Inside the `data/` directory, you will find a special file called `index.json`.

### ❓ What is it?
It is a **lookup registry/map** that links each unique `userCode` to the relative filepath of the JSON file where its full profile data is stored.

### ⚙️ How is it populated?
It is **automatically generated** by a Node.js utility script. You do not need to edit it manually! 
Whenever you add, delete, or modify JSON data files offline, simply run the following command in your terminal from the project root:
```bash
node tools/generate_index.js
```
The script will scan the entire `data/` directory, parse all user profile JSON documents, and rebuild `index.json`.

### 💡 Why is it useful?
In offline fallback mode or during local development, the browser is unable to automatically scan your computer's folders to find a client's profile.
1. When a visitor goes to `view.html?c=XXXXXXXX`, the landing page first fetches the lightweight `data/index.json` file.
2. It looks up `XXXXXXXX` in the index and gets `"clients/clients-1.json"`.
3. The page then fetches **only** that single JSON file to retrieve and render the profile.

This keeps profile lookups **instant, highly efficient, and extremely fast**, saving browser memory and network bandwidth!

### 📝 Example `index.json` Structure
```json
{
    "XXXXXXXX": "Account 1/profile-1.json",
    "YYYYYYYY": "Account 2/profile-1.json",
    "ZZZZZZZZ": "Account 3/profile-1.json"
}
```
