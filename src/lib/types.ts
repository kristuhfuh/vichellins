export type Condition = "new" | "refurbished" | "used";
export type WarrantyType = "manufacturer" | "store" | "none";
export type AuthenticityStatus = "verified" | "unverified";
export type SpecType = "text" | "number" | "select" | "boolean";
export type ProductKind =
  | "phone"
  | "laptop"
  | "headphones"
  | "earbuds"
  | "speaker"
  | "watch"
  | "camera"
  | "powerbank"
  | "vacuum"
  | "plug"
  | "charger";

export type Category = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string;
  kind: ProductKind;
  imageUrl?: string;
};

export type Brand = {
  id: string;
  name: string;
  slug: string;
};

/** A spec field a category's products fill in. Children inherit their parent's. */
export type SpecDefinition = {
  id: string;
  categoryId: string;
  key: string;
  label: string;
  type: SpecType;
  unit?: string;
  options?: string[];
  filterable: boolean;
};

export type SpecValue = string | number | boolean;

export type ProductOption = {
  name: string;
  values: string[];
};

export type Variant = {
  id: string;
  sku: string;
  optionValues: Record<string, string>;
  price: number;
  compareAtPrice?: number;
  stock: number;
};

export type Warranty = {
  months: number;
  type: WarrantyType;
  notes?: string;
};

export type Authenticity = {
  status: AuthenticityStatus;
  notes?: string;
};

export type ProductImage = {
  url: string;
  alt: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  brandId: string;
  categoryId: string;
  description: string;
  highlights: string[];
  featured: boolean;
  condition: Condition;
  warranty: Warranty;
  authenticity: Authenticity;
  specs: Record<string, SpecValue>;
  /** Overrides the category illustration when the product looks different from its category. */
  kind?: ProductKind;
  options: ProductOption[];
  variants: Variant[];
  images: ProductImage[];
  tone: string;
  createdAt: string;
  popularity: number;
};

export type DeliveryZone = {
  id: string;
  name: string;
  fee: number;
  eta: string;
};

export type Sort = "featured" | "newest" | "price-asc" | "price-desc" | "popular";

export type ShopQuery = {
  category?: string;
  brands?: string[];
  conditions?: Condition[];
  min?: number;
  max?: number;
  inStock?: boolean;
  q?: string;
  sort?: Sort;
  page?: number;
  specs?: Record<string, string[]>;
};
