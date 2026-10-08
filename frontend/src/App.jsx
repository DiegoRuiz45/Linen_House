import {
  Navigate,
  Routes,
  Route,
} from "react-router-dom";

// pages
import Home from "./pages/Home";
import Products from "./pages/Products";
import Checkout from "./pages/Checkout";
import ProductDetail from "./pages/ProductDetail";
import Account from "./pages/Account";
import Orders from "./pages/Orders";


function App() {

  return (

    <Routes>

      <Route
        path="/"
        element={<Home />}
      />


      <Route
        path="/productos"
        element={<Products />}
      />

      <Route
        path="/cubrelechos"
        element={<Navigate to="/productos" replace />}
      />

      <Route
        path="/checkout"
        element={<Checkout />}
      />

      <Route
        path="/productos/:slug"
        element={<ProductDetail />}
      />

      <Route
        path="/cuenta"
        element={<Account />}
      />

      <Route
        path="/mis-pedidos"
        element={<Orders />}
      />


    </Routes>

  );

}


export default App;
