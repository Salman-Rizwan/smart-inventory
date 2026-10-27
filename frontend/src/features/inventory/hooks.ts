import { useSubscription } from "../../shared/hooks/useSubscription";
import { subscribeProducts } from "./productRepository";

const LOAD_ERROR = "Stock records could not be loaded. Check your connection and sign in again if this continues.";

export const useProducts = () => useSubscription(subscribeProducts, LOAD_ERROR);
