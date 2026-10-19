# Yudhas Fashion API

Express API for account registration, password login, Google sign-in, session lookup, product management, order tracking, and Razorpay payments. User, product, and order data is stored in MongoDB; passwords are hashed with bcrypt, and sessions use an HTTP-only cookie.

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

For Razorpay, add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `api/.env`. These are server environment variables; only the key ID is returned to the browser when creating a checkout. Never add the key secret to `ui/.env`, frontend code, source control, or browser-visible configuration. Leave the Razorpay values blank to disable online checkout while retaining cash on delivery.

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

For external availability monitoring, use the deployed API's public `https://<your-api-domain>/api/health` URL. For example, in UptimeRobot create a new **HTTP(s)** monitor, give it a name such as `Yudhas Fashion API`, set the URL to that health endpoint, choose a 5-minute monitoring interval, and save it. The endpoint returns HTTP 200 with `{"status":"ok"}` while the API is running. Do not use `localhost` or `127.0.0.1` as the monitor URL; those addresses refer to the monitor's own machine. A monitor can alert you when the service is unavailable, but whether checks keep a sleeping service awake depends on the hosting provider's policy.

| Method   | Endpoint                       | Purpose                                                                |
| -------- | ------------------------------ | ---------------------------------------------------------------------- |
| `POST`   | `/api/auth/register`           | Create an account and start a session                                  |
| `POST`   | `/api/auth/login`              | Sign in with email and password                                        |
| `POST`   | `/api/auth/google`             | Verify a Google ID token and start a session                           |
| `GET`    | `/api/auth/me`                 | Get the current session's user                                         |
| `POST`   | `/api/auth/logout`             | Clear the session cookie                                               |
| `GET`    | `/api/products`                | List MongoDB products with storefront filters                          |
| `GET`    | `/api/products/:slug`          | Get a product by its slug                                              |
| `GET`    | `/api/products/:slug/related`  | Get related products                                                   |
| `GET`    | `/api/categories`              | List active MongoDB categories                                         |
| `GET`    | `/api/delivery-settings`       | Read the current flat delivery charge and free-delivery threshold      |
| `GET`    | `/api/admin/categories`        | List categories (admin only)                                           |
| `POST`   | `/api/admin/categories`        | Create a category by name (admin only)                                 |
| `DELETE` | `/api/admin/categories/:id`    | Delete an unused category (admin only)                                 |
| `GET`    | `/api/admin/products`          | List products (admin only)                                             |
| `POST`   | `/api/admin/products`          | Upload an image and create a product (admin only)                      |
| `PATCH`  | `/api/admin/products/:id`      | Update product details or replace its image (admin only)               |
| `DELETE` | `/api/admin/products/:id`      | Delete a product (admin only)                                          |
| `GET`    | `/api/admin/delivery-settings` | Read delivery pricing settings (admin only)                            |
| `PUT`    | `/api/admin/delivery-settings` | Set or update the flat delivery charge (admin only)                    |
| `POST`   | `/api/orders`                  | Place an authenticated cash-on-delivery order                          |
| `GET`    | `/api/orders/mine`             | List the signed-in customer's current and past orders                  |
| `POST`   | `/api/payments/orders`         | Recalculate cart prices and create a Razorpay order (authenticated)    |
| `POST`   | `/api/payments/verify`         | Verify checkout signature and confirm captured payment (authenticated) |
| `POST`   | `/api/payments/webhook`        | Verify Razorpay event signature and reconcile payment status           |
| `GET`    | `/api/orders/admin`            | List orders (admin only)                                               |
| `PATCH`  | `/api/orders/:id/status`       | Update an order status (admin only)                                    |

User documents include a `role` field restricted to `admin` or `user`. The API assigns `admin` only to `yudhasfashion@gmail.com`; registration input cannot choose a role. On startup, the API synchronizes existing users so that this email is `admin` and every other account is `user`. Authentication responses include the role.

The `/admin` frontend route and the product/order/category admin API endpoints require both a valid session and the administrator email; the UI role check is only for navigation, not authorization. Categories and products are created from the admin panel and stored in MongoDB; categories use a name and generated slug, and the app does not seed hard-coded category or product data. Product descriptions are stored as a single description. Product image files are uploaded with Multer to `api/uploads`, served from `/uploads`, and excluded from Git. MongoDB stores the image URL rather than image bytes. Public storefront listings, category filters, and product details are read from the same MongoDB collections. Keep the upload directory persistent in deployment or move file storage to a durable object-storage service before scaling beyond one API server.

Set the flat delivery charge from **Admin → Delivery** before accepting orders. The value is stored in MongoDB and applied server-side to both cash-on-delivery and Razorpay orders; the browser never supplies the delivery amount. The existing free-delivery threshold is ₹5,000 and is returned with the public delivery settings. Checkout remains unavailable until an administrator saves a charge.

## Razorpay setup and test checklist

1. In the Razorpay dashboard, keep **Test Mode** enabled while integrating. Under **Account & Settings → Website and app settings → API keys**, generate a test key. Copy the Key ID and Key Secret into `api/.env` as `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Razorpay only displays the secret when generated; store it securely and do not send it to the frontend.
2. Restart the API after editing `.env`. The checkout page sends cart identifiers and quantities to the API; the API reloads product prices and stock from MongoDB and creates the Razorpay order in INR paise.
3. Test checkout at the local UI. Razorpay Checkout is loaded from `https://checkout.razorpay.com/v1/checkout.js`. Use the current test payment details shown in Razorpay's official test-mode documentation. The cart is cleared only after the backend verifies the checkout signature and confirms capture.
4. Configure webhook delivery for both `payment.captured` and `payment.failed`. Set the webhook URL to `https://<your-api-domain>/api/payments/webhook` and set the same randomly generated webhook secret in the Razorpay dashboard and `RAZORPAY_WEBHOOK_SECRET` in the API environment. For local webhook testing, expose the API with a trusted HTTPS tunnel and use its HTTPS URL; do not expose a production secret in a public tunnel.
5. Confirm successful test orders in MongoDB and the Admin → Orders page. Razorpay orders store their payment method, payment status, Razorpay order ID, and (after payment) payment ID. The webhook uses the exact raw request body for signature verification and is idempotent for repeated events.
6. Before going live, activate the Razorpay account and complete website/business verification. Deploy the API over HTTPS, configure production environment secrets and the production webhook URL, then generate **Live Mode** keys and replace the test keys only in the server environment. Test using a low-value live transaction and refund it through the Razorpay dashboard if appropriate.

The API never trusts a client-supplied amount. It validates the signed checkout response, checks the payment against the Razorpay order ID, INR amount and currency, and captures authorized payments server-side before marking them captured. Cash on delivery remains available separately. Do not mark an order as paid based only on the browser's checkout success callback; the callback is not trusted until the server verifies it.

Set `BACKEND_API_URL` in the UI environment to the API origin when it is not `http://localhost:4000`. In production, serve the API over HTTPS and set `NODE_ENV=production`.
