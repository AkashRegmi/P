export interface Review {
  rating: number;
  comment: string;
  date: string;
  reviewerName: string;
  reviewerEmail: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  tags: string[];
  reviews: Review[];
}

// Used when creating a product - id is auto-generated, reviews default to []
export interface CreateProductDTO {
  name: string;
  description: string;
  price: number;
  tags: string[];
  reviews?: Review[];
}

// Used when editing a product - all fields optional
export interface UpdateProductDTO {
  name?: string;
  description?: string;
  price?: number;
  tags?: string[];
  reviews?: Review[];
}
