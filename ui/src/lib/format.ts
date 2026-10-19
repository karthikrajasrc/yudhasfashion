export const formatINR = (value: number) =>
  `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export const discountPercent = (price: number, salePrice: number | null) =>
  salePrice && salePrice < price ? Math.round(((price - salePrice) / price) * 100) : 0;

export const effectivePrice = (price: number, salePrice: number | null) =>
  salePrice && salePrice < price ? salePrice : price;
