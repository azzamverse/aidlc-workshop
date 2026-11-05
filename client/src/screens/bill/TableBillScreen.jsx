import { Link, useParams } from 'react-router-dom';
import { StaffBar } from '../../shell/StaffFrame.jsx';

/** TODO(U4): placeholder so the address works in the skeleton. U4 replaces this file. */
export function TableBillScreen() {
  const { id } = useParams();
  return (
    <>
      <StaffBar title={`Table ${id} bill`}>
        <Link className="btn secondary small" to="/staff" data-testid="bill-back-to-board">Back to board</Link>
      </StaffBar>
      <main className="bill" data-testid="bill-placeholder"><p className="muted">The bill arrives with the bill and close screen.</p></main>
    </>
  );
}
