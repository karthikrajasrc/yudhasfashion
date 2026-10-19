export const ADMIN_EMAIL = "yudhasfashion@gmail.com";

export function roleForEmail(email) {
  return email.trim().toLowerCase() === ADMIN_EMAIL ? "admin" : "user";
}
