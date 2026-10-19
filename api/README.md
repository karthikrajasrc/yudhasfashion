# Yudhas Fashion API

Express API for account registration, password login, Google sign-in, session lookup, product management, and order tracking. User, product, and order data is stored in MongoDB; passwords are hashed with bcrypt, and sessions use an HTTP-only cookie.

## Configure

From this folder, install dependencies and create a local environment file:

```powershell
npm install
Copy-Item .env.example .env
```

Set `MONGODB_URI` to your MongoDB connection string and `JWT_SECRET` to a random secret of at least 32 characters. For example, generate one with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

For Google sign-in, set `GOOGLE_CLIENT_ID` to the same OAuth client ID used by `ui/VITE_GOOGLE_CLIENT_ID`. In Google Cloud Console, add the frontend origin (normally `http://localhost:5173`) under **Authorized JavaScript origins** for that OAuth client; Google rejects sign-in until this exact origin is listed. Set `CLIENT_ORIGINS` to the exact comma-separated frontend origins that may call this API.

## Run

Start MongoDB, then run the API and frontend in separate terminals:

```powershell
npm run dev
```

```powershell
Set-Location ..\ui
npm run dev
```

The API listens on port `4000` by default. It exposes `GET /api/health` and these auth endpoints:

| Method   | Endpoint                  | Purpose                                           |
| -------- | ------------------------- | ------------------------------------------------- |
| `POST`   | `/api/auth/register`      | Create an account and start a session             |
| `POST`   | `/api/auth/login`         | Sign in with email and password                   |
| `POST`   | `/api/auth/google`        | Verify a Google ID token and start a session      |
| `GET`    | `/api/auth/me`            | Get the current session's user                    |
| `POST`   | `/api/auth/logout`        | Clear the session cookie                          |
| `GET`    | `/api/admin/products`     | List products (admin only)                        |
| `POST`   | `/api/admin/products`     | Upload an image and create a product (admin only) |
| `DELETE` | `/api/admin/products/:id` | Delete a product (admin only)                     |
| `POST`   | `/api/orders`             | Place an authenticated cash-on-delivery order     |
| `GET`    | `/api/orders/admin`       | List orders (admin only)                          |
| `PATCH`  | `/api/orders/:id/status`  | Update an order status (admin only)               |

User documents include a `role` field restricted to `admin` or `user`. The API assigns `admin` only to `yudhasfashion@gmail.com`; registration input cannot choose a role. On startup, the API synchronizes existing users so that this email is `admin` and every other account is `user`. Authentication responses include the role.

The `/admin` frontend route and the product/order admin API endpoints require both a valid session and the administrator email; the UI role check is only for navigation, not authorization. Product image files are uploaded with Multer to `api/uploads`, served from `/uploads`, and excluded from Git. MongoDB stores the image URL rather than image bytes. Keep the upload directory persistent in deployment or move file storage to a durable object-storage service before scaling beyond one API server. Checkout currently records cash-on-delivery orders only; no payment provider is configured.

Set `VITE_API_URL` in the UI environment to the API origin when it is not `http://localhost:4000`. In production, serve the API over HTTPS and set `NODE_ENV=production`.
