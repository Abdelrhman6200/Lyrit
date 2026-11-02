-- AlterTable
ALTER TABLE "products" ADD COLUMN     "search_vector" tsvector;

-- CreateIndex
CREATE INDEX "products_search_vector_idx" ON "products" USING GIN ("search_vector");

-- Keep search_vector in sync with product text fields.
CREATE OR REPLACE FUNCTION products_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.short_description, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(NEW.ingredients, '')), 'D') ||
    setweight(to_tsvector('simple', COALESCE(array_to_string(NEW.benefits, ' '), '')), 'D');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_search_vector_trigger
BEFORE INSERT OR UPDATE OF name, tags, short_description, description, ingredients, benefits
ON products FOR EACH ROW EXECUTE FUNCTION products_search_vector_update();

-- Guard rails that must hold even if application code has a bug.
ALTER TABLE product_variants ADD CONSTRAINT product_variants_stock_non_negative CHECK (stock_quantity >= 0);
ALTER TABLE product_variants ADD CONSTRAINT product_variants_price_non_negative CHECK (price_minor >= 0);
ALTER TABLE cart_items ADD CONSTRAINT cart_items_quantity_positive CHECK (quantity > 0);
ALTER TABLE orders ADD CONSTRAINT orders_total_non_negative CHECK (total_minor >= 0);
