import { Route, Routes } from 'react-router-dom';
import { TableBillScreen } from './screens/bill/TableBillScreen.jsx';
import { CartScreen } from './screens/diner/CartScreen.jsx';
import { MenuScreen } from './screens/diner/MenuScreen.jsx';
import { MyOrdersScreen } from './screens/diner/MyOrdersScreen.jsx';
import { KitchenBoardScreen } from './screens/kitchen/KitchenBoardScreen.jsx';
import { DinerFrame } from './shell/DinerFrame.jsx';
import { StaffFrame } from './shell/StaffFrame.jsx';

/**
 * Contract C5: every screen address. U2 replaces the files in screens/diner,
 * U3 those in screens/kitchen and U4 those in screens/bill; none edits this file.
 */
export function App() {
  return (
    <Routes>
      <Route path="/table/:id" element={<DinerFrame />}>
        <Route index element={<MenuScreen />} />
        <Route path="cart" element={<CartScreen />} />
        <Route path="orders" element={<MyOrdersScreen />} />
      </Route>
      <Route path="/staff" element={<StaffFrame />}>
        <Route index element={<KitchenBoardScreen />} />
        <Route path="tables/:id" element={<TableBillScreen />} />
      </Route>
    </Routes>
  );
}
