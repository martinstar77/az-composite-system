# UI/UX & Security Strategy: AZ Composite

## 1. Brand Identity & Color Palette
The application must strictly follow the official AZ Composite brand colors. These have been directly integrated into the global CSS variables.

| Color Name | Hex Code | Usage in App |
| :--- | :--- | :--- |
| **Main Purple** | `#8A0485` | Primary buttons, active sidebar links, loading spinners, primary accents (borders on focus). |
| **Middle Purple** | `#BF5BBB` | Button hover states, secondary accents, active badges/tags. |
| **Light Purple** | `#F2B0EF` | Highlight backgrounds, selected table row backgrounds, subtle alerts. |
| **Dark Gray** | `#4D4D4D` | Main typography, sidebar background, default icons, borders. |
| **White** | `#FFFFFF` | Main background, card backgrounds, text inside primary buttons. |

## 2. Layout & Shell
The application will utilize a modern "Enterprise Shell":
- **Left Sidebar:** Dark Gray (`#4D4D4D`) background with White text. Active items highlighted with Main Purple (`#8A0485`).
- **Top Header:** White background with a subtle border. Contains the AZ Composite logo (from `/public/brand/`), global search, and user profile/logout.
- **Main Content Area:** Very light gray/zinc background to make the White content cards "pop".

## 3. Role-Based Access Control (RBAC) Matrix
The application uses Supabase Auth. Access to modules is strictly controlled based on the user's role.

| Module / Feature | Admin | Manager | Warehouse | Sales |
| :--- | :---: | :---: | :---: | :---: |
| **Login / Logout** | ✅ | ✅ | ✅ | ✅ |
| **View Products (PIM)** | ✅ | ✅ | ✅ | ✅ |
| **Add/Edit Products** | ✅ | ✅ | ❌ | ❌ |
| **View Margin/COGS** | ✅ | ✅ | ❌ | ❌ |
| **Manage Suppliers** | ✅ | ✅ | ❌ | ❌ |
| **Manage Inventory (Batches)**| ✅ | ✅ | ✅ | ❌ |
| **Create Sales Orders** | ✅ | ✅ | ❌ | ✅ |
| **Financial Settings/Users**| ✅ | ❌ | ❌ | ❌ |

## 4. Logo Integration
- Ensure the official logo is uploaded to `public/brand/logo.png`.
- The logo will be sized dynamically but will have a maximum height of `40px` in the header to maintain a clean aesthetic.
