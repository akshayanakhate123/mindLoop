import finance from './finance.json';
import generalist from './generalist.json';
import marketing from './marketing.json';
import product from './product.json';
import sales from './sales.json';

export const datasets: Record<string, any[]> = {
  "Finance": finance,
  "Generalist": generalist,
  "Marketing": marketing,
  "Product": product,
  "Sales": sales
};