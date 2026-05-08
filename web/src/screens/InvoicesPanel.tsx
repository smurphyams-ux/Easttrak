import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';
import axios from 'axios';

function InvoicesPanel() {
      // ...existing code...
    // Inline editing state for dates
    const [inlineEditIdx, setInlineEditIdx] = useState<number | null>(null);
    const [inlineEditDates, setInlineEditDates] = useState<{ dateOrdered: string; reservedDate: string; dueDate: string }>({ dateOrdered: '', reservedDate: '', dueDate: '' });

    // Save inline date changes
    const handleInlineDateSave = async (invoice: any, idx: number) => {
      try {
        await axios.put(`/api/invoices/${invoice.id}`, {
          ...invoice,
          date_ordered: inlineEditDates.dateOrdered,
          reserve_date: inlineEditDates.reservedDate,
          due_date: inlineEditDates.dueDate,
        });
        setInvoices(prev => prev.map((inv, i) => i === idx ? { ...inv, date_ordered: inlineEditDates.dateOrdered, reserve_date: inlineEditDates.reservedDate, due_date: inlineEditDates.dueDate } : inv));
        setInlineEditIdx(null);
      } catch (err) {
        alert('Failed to update dates.');
      }
    };
  const navigate = useNavigate();
  // Paid invoice state: { paid: boolean, date: string }
  const [paidInfo, setPaidInfo] = useState<{ paid: boolean, date: string } | null>(null);
  // For printing
  const [printInvoice, setPrintInvoice] = useState<any | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  // Logo fallback state for print view
  // Use the provided PNG as the logo for invoices
  const [logoSrc] = useState<string>("/images/trashgoaway-banner.png");
  const [logoFailed, setLogoFailed] = useState<boolean>(false);
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any | null>(null);
  // Track last action to suppress edit modal after print/email
  const [lastAction, setLastAction] = useState<string | null>(null);

  const handleRowClick = (invoice: any) => {
    // Only open edit modal if not printing, not just closed print/email, not already editing, and last action was not print/email
    if (!printInvoice && !editingInvoice && lastAction !== 'print' && lastAction !== 'email') {
      setEditingInvoice(invoice);
      setEditForm({
        client: invoice.customer_name || '',
        phone: invoice.phone_number || '',
        email: invoice.email || '',
        address: invoice.service_address || '',
        source: invoice.source || '',
        trailerNumber: invoice.trailer_number || '',
        trailerSize: invoice.trailer_size || '',
        reservedDate: invoice.reserve_date ? invoice.reserve_date.slice(0, 10) : '',
        paymentAmount: invoice.amount || '',
        dateOrdered: invoice.date_ordered ? invoice.date_ordered.slice(0, 10) : '',
        comment: invoice.comment || invoice.comments || invoice.notes || '',
      });
    }
    // Reset lastAction after a row click
    if (lastAction) setLastAction(null);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm((f: any) => ({ ...f, [name]: value }));
  };

  // (Removed duplicate handleEditSave definition)
  // Stub for handleEmailInvoice to fix missing reference error
  // Email Invoice handler for main page
  const handleEmailInvoice = async (invoice: any) => {
    setLastAction('email');
    if (!invoice.email) {
      alert('No email address found for this invoice. Please add an email to the customer or invoice.');
      return;
    }
    try {
      // Optionally, show a loading indicator here
      const paidInfo = invoice.paid && invoice.paidDate ? { paid: true, date: String(invoice.paidDate).slice(0, 10) } : null;
      const res = await axios.post('/api/email-invoice', {
        invoice,
        paidInfo,
        to: invoice.email,
      });
      if (res.data && res.data.success) {
        alert('Invoice emailed successfully!');
      } else {
        alert('Failed to email invoice.');
      }
    } catch (err: any) {
      alert('Failed to email invoice.' + (err?.response?.data?.error ? `\n${err.response.data.error}` : ''));
    }
  };

  const handleEditCancel = () => {
    setEditingInvoice(null);
    setEditForm(null);
  };
  const [trailerOptions, setTrailerOptions] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showAddTrailer, setShowAddTrailer] = useState(false);
  const [addTrailerForm, setAddTrailerForm] = useState({ number: '', size: '' });
  const [addingTrailer, setAddingTrailer] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    dateOrdered: '',
    reservedDate: '',
    trailerNumber: '',
    trailerSize: '',
    address: '',
    client: '',
    phone: '',
      email: '',
    source: '',
    comment: '',
    paymentAmount: '',
  });

  // Preset comment options and their corresponding amounts
  const commentOptions = [
    { label: 'Standard Delivery', amount: 250 },
    { label: 'Express Delivery', amount: 350 },
    { label: 'Pickup Only', amount: 100 },
    { label: 'Long Distance', amount: 400 },
    { label: 'Special Handling', amount: 500 },
    { label: '10 CYD 4 day rental up to 2 tons, $120 per ton after', amount: 295 },
  ];
  const [saving, setSaving] = useState(false);

  const fetchTrailerOptions = async () => {
    try {
      const res = await axios.get('/api/trailer-options');
      // The backend returns { success: true, options: [...] }
      setTrailerOptions(Array.isArray(res.data.options) ? res.data.options : []);
    } catch {
      setTrailerOptions([]);
    }
  };
  useEffect(() => {
    fetchTrailerOptions();
    const fetchInvoices = async () => {
      try {
        const res = await axios.get('/api/invoices');
        // Defensive: ensure invoices is always an array
        const data = Array.isArray(res.data.invoices) ? res.data.invoices : [];
        setInvoices(data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch invoices');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
    // Fetch customers for dropdown
    const fetchCustomers = async () => {
      try {
        const res = await axios.get('/api/customers');
        // The backend returns { success: true, customers: [...] }
        setCustomers(Array.isArray(res.data.customers) ? res.data.customers : []);
      } catch {
        setCustomers([]);
      }
    };
    fetchCustomers();
  }, []);

  const handleDelete = async (invoiceId: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await axios.delete(`/api/invoices/${invoiceId}`);
      setInvoices(invoices.filter((inv: any) => inv.id !== invoiceId));
    } catch (err) {
      alert('Failed to delete invoice.');
    }
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'trailerNumber') {
      const selected = trailerOptions.find(
        (tr: any) => String(tr.number || tr.id) === value
      );
      setForm(f => ({
        ...f,
        trailerNumber: value,
        trailerSize: selected && selected.size ? selected.size : '',
      }));
    } else if (name === 'client') {
      // If the value matches a customer, autofill phone
      const selectedCustomer = customers.find((c: any) => c.name === value);
      setForm(f => ({
        ...f,
        client: value,
        phone: selectedCustomer ? selectedCustomer.phone || '' : f.phone,
          email: selectedCustomer ? selectedCustomer.email || '' : f.email,
      }));
    } else if (name === 'comment') {
      // If the value matches a preset, auto-fill paymentAmount
      const preset = commentOptions.find(opt => opt.label === value);
      setForm(f => ({
        ...f,
        comment: value,
        paymentAmount: preset ? String(preset.amount) : f.paymentAmount,
      }));
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // If email is present and matches a customer, update the customer email
      if (form.client && form.email) {
        const customer = customers.find((c: any) => c.name === form.client);
        if (customer && customer.email !== form.email) {
          await axios.put(`/api/customers/${customer.id}`, {
            name: customer.name,
            phone: customer.phone,
            email: form.email,
            businessId: customer.businessId,
          });
        }
      }
      const res = await axios.post('/api/invoices', {
        customer_name: form.client,
        phone_number: form.phone,
        service_address: form.address,
        source: form.source,
        trailer_number: form.trailerNumber,
        trailer_size: form.trailerSize,
        reserve_date: form.reservedDate,
        amount: form.paymentAmount ? Number(form.paymentAmount) : 0,
        status: 'pending',
        date_ordered: form.dateOrdered,
        notes: form.comment,
        email: form.email,
        businessId: 'default-business',
      });
      setInvoices([res.data, ...invoices]);
      setShowForm(false);
      setForm({
        dateOrdered: '',
        reservedDate: '',
        trailerNumber: '',
        trailerSize: '',
        address: '',
        client: '',
        phone: '',
        email: '',
        source: '',
        comment: '',
        paymentAmount: '',
      });
    } catch (err) {
      alert('Failed to create invoice.');
    } finally {
      setSaving(false);
    }
  };

  // Add trailer submit handler
  const handleAddTrailer = async () => {
    if (!addTrailerForm.number) return;
    setAddingTrailer(true);
    try {
      await axios.post('/api/trailer-options', {
        number: addTrailerForm.number,
        size: addTrailerForm.size,
      });
      setAddTrailerForm({ number: '', size: '' });
      setShowAddTrailer(false);
      await fetchTrailerOptions();
    } catch {
      alert('Failed to add trailer.');
    } finally {
      setAddingTrailer(false);
    }
  };

  // Handler to show printable invoice in a hidden div and print
  const handleViewInvoice = (invoice: any) => {
    setLastAction('print');
    setPrintInvoice(invoice);
    // If invoice is already paid, show watermark
    if (invoice.paid && invoice.paidDate) {
      setPaidInfo({ paid: true, date: String(invoice.paidDate).slice(0, 10) });
    } else {
      setPaidInfo(null);
    }
    setTimeout(() => {
      if (printRef.current) {
        window.print();
      }
    }, 100);
  };

  // Mark as Paid handler
  const handleMarkAsPaid = async () => {
    if (!printInvoice) return;
    const paidDate = new Date().toISOString().slice(0, 10);
    try {
      await axios.put(`/api/invoices/${printInvoice.id}`, {
        ...printInvoice,
        paid: true,
        paidDate,
      });
      setPaidInfo({ paid: true, date: paidDate });
      // Update invoice in local state
      setPrintInvoice({ ...printInvoice, paid: true, paidDate });
      setInvoices((prev) => prev.map(inv => inv.id === printInvoice.id ? { ...inv, paid: true, paidDate } : inv));
    } catch (err) {
      alert('Failed to mark as paid.');
    }
  };

  let printPortal = null;
  // Handler for emailing invoice with PDF attachment and custom message (server-side)
  const handleEditSave = async () => {
    if (!editingInvoice) return;
    try {
      // If email is present and matches a customer, update the customer email
      if (editForm.client && editForm.email) {
        const customer = customers.find((c: any) => c.name === editForm.client);
        if (customer && customer.email !== editForm.email) {
          await axios.put(`/api/customers/${customer.id}`, {
            name: customer.name,
            phone: customer.phone,
            email: editForm.email,
            businessId: customer.businessId,
          });
        }
      }
      await axios.put(`/api/invoices/${editingInvoice.id}`, {
        customer_name: editForm.client,
        phone_number: editForm.phone,
        service_address: editForm.address,
        source: editForm.source,
        trailer_number: editForm.trailerNumber,
        trailer_size: editForm.trailerSize,
        reserve_date: editForm.reservedDate,
        amount: editForm.paymentAmount ? Number(editForm.paymentAmount) : 0,
        date_ordered: editForm.dateOrdered,
        notes: editForm.comment,
        email: editForm.email,
      });
      // Refresh invoices
      const res = await axios.get('/api/invoices');
      setInvoices(Array.isArray(res.data.invoices) ? res.data.invoices : []);
      setEditingInvoice(null);
      setEditForm(null);
    } catch (err) {
      alert('Failed to update invoice.');
    }
  };
  // jsPDF dependency note: run `npm install jspdf` in your web/ directory if not already installed.
  if (printInvoice) {
    printPortal = ReactDOM.createPortal(
      <div
        ref={printRef}
        className="print-invoice"
        style={{ background: '#f7fafc', padding: 24, borderRadius: 8, maxWidth: 700, margin: '0 auto', width: '100%', breakAfter: 'avoid-page' }}
      >
        <style>{`
          @media print {
            html, body {
              background: #fff !important;
            }
            body > *:not(.print-invoice) { display: none !important; }
            .print-invoice {
              display: block !important;
              position: static !important;
              left: auto !important;
              top: auto !important;
              background: #fff !important;
              box-shadow: none !important;
              margin: 0 auto !important;
              max-width: 700px !important;
              width: 100% !important;
              break-after: avoid-page !important;
            }
            .print-invoice .close-print-btn { display: none !important; }
            .print-invoice button, .print-invoice [type='button'] { display: none !important; }
            .print-invoice .mark-paid-btn, .print-invoice .close-print-btn, .print-invoice .email-invoice-btn, .print-invoice [type='button'] { display: none !important; }
            .print-invoice .paid-watermark { display: block !important; }
            .print-invoice .email-invoice-btn { display: none !important; }
            .print-invoice * { page-break-inside: avoid !important; }
            @page { size: A4; margin: 0.2in; }
          }
        `}</style>
        <button
          className="close-print-btn"
          onClick={() => {
            setPrintInvoice(null);
            setLastAction(null);
          }}
          style={{ float: 'right', background: '#e2e8f0', color: '#2d3748', border: 'none', borderRadius: 6, padding: '4px 12px', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 10 }}
        >
          Close
        </button>
        {/* PAID Watermark */}
        {paidInfo?.paid && (
          <div
            className="paid-watermark"
            style={{
              position: 'absolute',
              top: '40%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-20deg)',
              fontSize: 80,
              color: 'rgba(229, 62, 62, 0.18)',
              fontWeight: 900,
              zIndex: 10000,
              pointerEvents: 'none',
              userSelect: 'none',
              textAlign: 'center',
              width: '100%',
              whiteSpace: 'pre',
            }}
          >
            {'PAID\n' + paidInfo.date}
          </div>
        )}
                      {/* Action buttons are only in the main table, not in the print modal */}
        <div className="header" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 12, position: 'relative', zIndex: 2 }}>
          {/* Logo with fallback: try absolute, then relative, then text fallback */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            {logoFailed ? (
              <div style={{ fontWeight: 'bold', fontSize: 18, color: '#c53030', border: '2px solid orange', padding: 8, minWidth: 220, minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                TrashGoAway.com
              </div>
            ) : (
              <img
                src={logoSrc}
                className="logo"
                alt="TrashGoAway.com Banner Logo"
                style={{ height: 80, width: 'auto', border: 'none', objectFit: 'contain', marginRight: 0, marginTop: 0, display: 'block' }}
                onError={() => setLogoFailed(true)}
              />
            )}
            {/* Mark as Paid button always visible in modal, hidden in print */}
            <button
              className="mark-paid-btn"
              onClick={handleMarkAsPaid}
              style={{
                background: '#e53e3e',
                color: '#fff',
                border: '2px solid #c53030',
                borderRadius: 6,
                padding: '8px 18px',
                fontWeight: 700,
                fontSize: 16,
                cursor: 'pointer',
                marginTop: 12,
                boxShadow: '0 1px 4px #0001',
                zIndex: 10,
                display: 'block',
              }}
            >
              Mark as Paid
            </button>
          </div>
          <div className="company-info" style={{ fontSize: 13, fontWeight: 600, color: '#2d3748', marginTop: 8, textAlign: 'right', flex: 1 }}>
            TrashGoAway.com L.L.C<br />
            <div style={{ fontWeight: 400, fontSize: 12, marginTop: 6, textAlign: 'right', lineHeight: 1.5 }}>
              2466 Emmons Rd<br />
              Jackson, MI 49201<br />
              PH: 517-803-3000<br />
              PH: 248-388-1000<br />
              info@trashgoaway.com<br />
              www.trashgoaway.com
            </div>
          </div>
        </div>
        <h2 style={{ marginBottom: 12, color: '#2d3748', fontSize: 18 }}>Invoice #{printInvoice.invoice_id || printInvoice.id}</h2>
        <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: 10, background: '#fff', boxShadow: '0 1px 4px #0002', borderRadius: 6, overflow: 'hidden' }}>
          <tbody>
            <tr><th style={{ background: '#e2e8f0', textAlign: 'left', padding: '5px 7px', fontSize: 12 }}>Date Ordered</th><td style={{ border: '1px solid #ccc', padding: '5px 7px', fontSize: 12 }}>{printInvoice.date_ordered ? String(printInvoice.date_ordered).slice(0, 10) : ''}</td></tr>
            <tr><th style={{ background: '#e2e8f0', textAlign: 'left', padding: '5px 7px', fontSize: 12 }}>Reserved Date</th><td style={{ border: '1px solid #ccc', padding: '5px 7px', fontSize: 12 }}>{printInvoice.reserve_date ? String(printInvoice.reserve_date).slice(0, 10) : ''}</td></tr>
            <tr><th style={{ background: '#e2e8f0', textAlign: 'left', padding: '5px 7px', fontSize: 12 }}>Trailer #</th><td style={{ border: '1px solid #ccc', padding: '5px 7px', fontSize: 12 }}>{printInvoice.trailer_number || ''}</td></tr>
            <tr><th style={{ background: '#e2e8f0', textAlign: 'left', padding: '5px 7px', fontSize: 12 }}>Trailer Size</th><td style={{ border: '1px solid #ccc', padding: '5px 7px', fontSize: 12 }}>{printInvoice.trailer_size || ''}</td></tr>
            <tr><th style={{ background: '#e2e8f0', textAlign: 'left', padding: '5px 7px', fontSize: 12 }}>Address</th><td style={{ border: '1px solid #ccc', padding: '5px 7px', fontSize: 12 }}>{printInvoice.service_address || printInvoice.address || ''}</td></tr>
            <tr><th style={{ background: '#e2e8f0', textAlign: 'left', padding: '5px 7px', fontSize: 12 }}>Client</th><td style={{ border: '1px solid #ccc', padding: '5px 7px', fontSize: 12 }}>{printInvoice.customer_name || printInvoice.client || ''}</td></tr>
            <tr><th style={{ background: '#e2e8f0', textAlign: 'left', padding: '5px 7px', fontSize: 12 }}>Phone #</th><td style={{ border: '1px solid #ccc', padding: '5px 7px', fontSize: 12 }}>{printInvoice.phone_number || printInvoice.phone || ''}</td></tr>
            <tr><th style={{ background: '#e2e8f0', textAlign: 'left', padding: '5px 7px', fontSize: 12 }}>Source</th><td style={{ border: '1px solid #ccc', padding: '5px 7px', fontSize: 12 }}>{printInvoice.source || ''}</td></tr>
            <tr><th style={{ background: '#e2e8f0', textAlign: 'left', padding: '5px 7px', fontSize: 12 }}>Comments</th><td style={{ border: '1px solid #ccc', padding: '5px 7px', fontSize: 12 }}>{printInvoice.comment || printInvoice.comments || printInvoice.notes || ''}</td></tr>
            <tr><th style={{ background: '#e2e8f0', textAlign: 'left', padding: '5px 7px', fontSize: 12 }}>Payment Amount</th><td style={{ border: '1px solid #ccc', padding: '5px 7px', fontSize: 12 }}>{printInvoice.amount ? `$${printInvoice.amount}` : ''}</td></tr>
          </tbody>
        </table>
        <div className="terms" style={{ marginTop: 14, fontSize: 11, color: '#333', background: '#fff', padding: 10, borderRadius: 6, boxShadow: '0 1px 4px #0001' }}>
          <div><b>Terms & Conditions:</b></div>
          <div style={{ marginTop: 4 }}>
            All materials must be inside the trailer. Please do not fill up the trailer over the top of the trailer. By law we are required to tarp each load for transport. All materials that exceed the top of the trailer must be removed. We can not haul trailers that are too full. You will be responsible for removing excess and a $100.00 return trip fee will be charged to return and pick up trailer. _____
          </div>
          {/* Removed per user request: 7-day rate and extra charges line */}
          <div className="note" style={{ fontWeight: 'bold', color: '#b7791f', marginTop: 8, fontSize: 11 }}>
            Note:<br />
            BATTERIES WILL ONLY BE ACCEPTED IF THEY ARE STACKED OUTSIDE OF THE TRAILER ON THE GROUND. _____
          </div>
          <div className="prohibited" style={{ color: '#c53030', fontWeight: 'bold', marginTop: 8, fontSize: 11 }}>
            ITEMS NOT ACCEPTED:<br />
            Animals &bull; Flammable Liquids &bull; Antifreeze &bull; Hazardous Waste &bull; Asbestos containing materials &bull; Herbicides/Pesticides &bull; Medical Waste &bull; Bricks &bull; Oil Filters &bull; Oil of any kind &bull; Cement &bull; Paint &bull; Gravel &bull; Propane and Propane Tanks &bull; Retaining Blocks &bull; Railroad Ties &bull; Compost &bull; Solvents &bull; Dirt &bull; Radioactive Materials &bull; Explosives &bull; Stones/Rocks &bull; Lead Containing materials.<br />
            <span style={{ fontWeight: 'normal', color: '#333' }}>PROHIBITED MATERIALS WILL RESULT IN IMMEDIATE TERMINATION OF SERVICE WITH NO REFUND. CUSTOMER IS RESPONSIBLE FOR REMOVAL AND DISPOSAL COST. ALL DEBRIS WILL BE LEFT AT THE PROPERTY AND WILL NOT BE REMOVED. NO EXCEPTIONS!______</span>
          </div>
          <div style={{ marginTop: 6, color: '#c05621', fontSize: 11 }}>
            PLEASE DO NOT MOVE OR ATTEMPT TO MOVE THE TRAILER OR A $100.00 FEE WILL BE ASSESSED PLUS THE COST OF REPAIR OF ANY DAMAGES CAUSED.  ______
          </div>
          <div className="signature" style={{ marginTop: 12, fontSize: 12 }}>
            Signature: ______________________________________
          </div>
          <div style={{ marginTop: 8, fontWeight: 'bold', color: '#276749', fontSize: 11 }}>
            NOW ACCEPTING TIRES ($27.00 PER TIRE) - Tires must be placed next to the dumpster on the ground, not in the dumpster. If tires are found in the dumpster, your card will automatically be charged a per-tire fee. _________
          </div>
        </div>
      </div>,
      document.body
    );
  }
  return (
    <>
      <div style={{ margin: '24px 24px 0 24px' }}>
        <a href="/create-invoice" style={{
          display: 'inline-block',
          background: '#2563eb',
          color: '#fff',
          padding: '8px 18px',
          borderRadius: 6,
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: 16,
          marginBottom: 16,
          boxShadow: '0 1px 4px #0001',
        }}>+ New Invoice (direct link)</a>
      </div>
      {printPortal}
      <div>
        <img
          src="/EasyTrakLogo-fancy.svg"
          alt="EasyTrak LLC Logo"
          style={{ height: 38, margin: '24px 0 0 24px', display: 'block' }}
        />
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: '#e2e8f0',
            color: '#2d3748',
            border: 'none',
            borderRadius: 6,
            padding: '6px 18px',
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
            boxShadow: '0 1px 4px #0001',
            margin: '24px 0 0 24px',
            display: 'block',
          }}
        >
          ← Back
        </button>
        <button
          style={{
            background: '#38a169',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '6px 18px',
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
            boxShadow: '0 1px 4px #0001',
            margin: '24px 0 0 24px',
            display: 'block',
          }}
          onClick={() => navigate('/create-invoice')}
        >
          Create Invoice
        </button>
        <div style={{ margin: '32px 24px 0 24px' }}>
          {loading ? (
            <div>Loading invoices...</div>
          ) : error ? (
            <div style={{ color: 'red' }}>{error}</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', boxShadow: '0 1px 8px #0002', borderRadius: 8, overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#f7fafc', textAlign: 'left' }}>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>Date Ordered</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>Reserved Date</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>Due Date</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>City</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>State</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>ZIP</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>Invoice #</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>Trailer #</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>Trailer Size</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>Address</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>City</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>State</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>ZIP</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>Client</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>Phone #</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>Source</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>Comments</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>Payment Amount</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ textAlign: 'center', padding: 24 }}>No invoices found.</td>
                  </tr>
                ) : (
                  invoices.map((invoice: any, idx: number) => (
                    <tr key={invoice.id || idx} onClick={e => {
                      // Prevent row click if inline editing is active or if clicking on an action button
                      if (inlineEditIdx === idx) return;
                      // Only open edit modal if not clicking a button
                      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
                      handleRowClick(invoice);
                    }} style={{ cursor: 'pointer' }}>
                      <td style={{ padding: '8px', borderTop: '1px solid #e2e8f0' }}>
                        {inlineEditIdx === idx ? (
                          <input
                            type="date"
                            value={inlineEditDates.dateOrdered}
                            onChange={e => setInlineEditDates(d => ({ ...d, dateOrdered: e.target.value }))}
                            style={{ width: 130 }}
                          />
                        ) : (
                          <span onClick={() => {
                            setInlineEditIdx(idx);
                            setInlineEditDates({
                              dateOrdered: invoice.date_ordered ? invoice.date_ordered.slice(0, 10) : '',
                              reservedDate: invoice.reserve_date ? invoice.reserve_date.slice(0, 10) : '',
                              dueDate: invoice.due_date ? invoice.due_date.slice(0, 10) : '',
                            });
                          }} style={{ cursor: 'pointer' }}>{invoice.date_ordered || ''}</span>
                        )}
                      </td>
                      <td style={{ padding: '8px', borderTop: '1px solid #e2e8f0' }}>
                        {inlineEditIdx === idx ? (
                          <input
                            type="date"
                            value={inlineEditDates.reservedDate}
                            onChange={e => setInlineEditDates(d => ({ ...d, reservedDate: e.target.value }))}
                            style={{ width: 130 }}
                          />
                        ) : (
                          <span onClick={() => {
                            setInlineEditIdx(idx);
                            setInlineEditDates({
                              dateOrdered: invoice.date_ordered ? invoice.date_ordered.slice(0, 10) : '',
                              reservedDate: invoice.reserve_date ? invoice.reserve_date.slice(0, 10) : '',
                              dueDate: invoice.due_date ? invoice.due_date.slice(0, 10) : '',
                            });
                          }} style={{ cursor: 'pointer' }}>{invoice.reserve_date || invoice.due_date || ''}</span>
                        )}
                      </td>
                      <td style={{ padding: '8px', borderTop: '1px solid #e2e8f0' }}>
                        {inlineEditIdx === idx ? (
                          <input
                            type="date"
                            value={inlineEditDates.dueDate}
                            onChange={e => setInlineEditDates(d => ({ ...d, dueDate: e.target.value }))}
                            style={{ width: 130 }}
                          />
                        ) : (
                          <span onClick={() => {
                            setInlineEditIdx(idx);
                            setInlineEditDates({
                              dateOrdered: invoice.date_ordered ? invoice.date_ordered.slice(0, 10) : '',
                              reservedDate: invoice.reserve_date ? invoice.reserve_date.slice(0, 10) : '',
                              dueDate: invoice.due_date ? invoice.due_date.slice(0, 10) : '',
                            });
                          }} style={{ cursor: 'pointer' }}>{invoice.due_date || ''}</span>
                        )}
                      </td>
                      <td style={{ padding: '8px', borderTop: '1px solid #e2e8f0' }}>{invoice.city || ''}</td>
                      <td style={{ padding: '8px', borderTop: '1px solid #e2e8f0' }}>{invoice.state || ''}</td>
                      <td style={{ padding: '8px', borderTop: '1px solid #e2e8f0' }}>{invoice.zip || ''}</td>
                      <td style={{ padding: '8px', borderTop: '1px solid #e2e8f0' }}>{invoice.invoice_id || invoice.id}</td>
                      <td style={{ padding: '8px', borderTop: '1px solid #e2e8f0' }}>{invoice.trailer_number || ''}</td>
                      <td style={{ padding: '8px', borderTop: '1px solid #e2e8f0' }}>{invoice.trailer_size || ''}</td>
                      <td style={{ padding: '8px', borderTop: '1px solid #e2e8f0' }}>{invoice.service_address || invoice.address || ''}</td>
                      <td style={{ padding: '8px', borderTop: '1px solid #e2e8f0' }}>{invoice.city || ''}</td>
                      <td style={{ padding: '8px', borderTop: '1px solid #e2e8f0' }}>{invoice.state || ''}</td>
                      <td style={{ padding: '8px', borderTop: '1px solid #e2e8f0' }}>{invoice.zip || ''}</td>
                      <td style={{ padding: '8px', borderTop: '1px solid #e2e8f0' }}>{invoice.customer_name || invoice.client || ''}</td>
                      <td style={{ padding: '8px', borderTop: '1px solid #e2e8f0' }}>{invoice.phone_number || invoice.phone || ''}</td>
                      <td style={{ padding: '8px', borderTop: '1px solid #e2e8f0' }}>{invoice.source || ''}</td>
                      <td style={{ padding: '8px', borderTop: '1px solid #e2e8f0' }}>{invoice.comment || invoice.comments || invoice.notes || ''}</td>
                      <td style={{ padding: '8px', borderTop: '1px solid #e2e8f0' }}>{invoice.amount ? `$${invoice.amount}` : ''}</td>
                      <td style={{ padding: '8px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                        {inlineEditIdx === idx ? (
                          <>
                            <button
                              style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                              onClick={e => { e.stopPropagation(); handleInlineDateSave(invoice, idx); }}
                            >Save</button>
                            <button
                              style={{ background: '#e2e8f0', color: '#222', border: 'none', borderRadius: 6, padding: '4px 12px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                              onClick={e => { e.stopPropagation(); setInlineEditIdx(null); }}
                            >Cancel</button>
                          </>
                        ) : (
                          <>
                            <button
                              style={{
                                background: '#3182ce',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                padding: '4px 12px',
                                fontWeight: 600,
                                fontSize: 14,
                                cursor: 'pointer',
                                boxShadow: '0 1px 4px #0001',
                              }}
                              onClick={e => { e.stopPropagation(); handleViewInvoice(invoice); }}
                            >
                              Print
                            </button>
                            <button
                              style={{
                                background: '#38a169',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                padding: '4px 12px',
                                fontWeight: 600,
                                fontSize: 14,
                                cursor: 'pointer',
                                boxShadow: '0 1px 4px #0001',
                              }}
                              onClick={e => { e.stopPropagation(); handleEmailInvoice(invoice); }}
                            >
                              Email Invoice
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        {/* Edit Invoice Modal */}
        {editingInvoice && editForm && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ background: '#fff', padding: 32, borderRadius: 10, minWidth: 400, boxShadow: '0 2px 16px #0003' }}>
              <h2>Edit Invoice</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input name="client" value={editForm.client} onChange={handleEditFormChange} placeholder="Client" style={{ padding: 8 }} />
                <input name="phone" value={editForm.phone} onChange={handleEditFormChange} placeholder="Phone #" style={{ padding: 8 }} />
                  <input name="email" value={editForm.email} onChange={handleEditFormChange} placeholder="Email (optional)" style={{ padding: 8 }} type="email" />
                <input name="address" value={editForm.address} onChange={handleEditFormChange} placeholder="Address" style={{ padding: 8 }} />
                <input name="source" value={editForm.source} onChange={handleEditFormChange} placeholder="Source" style={{ padding: 8 }} />
                <input name="trailerNumber" value={editForm.trailerNumber} onChange={handleEditFormChange} placeholder="Trailer #" style={{ padding: 8 }} />
                <input name="trailerSize" value={editForm.trailerSize} onChange={handleEditFormChange} placeholder="Trailer Size" style={{ padding: 8 }} />
                <input name="reservedDate" value={editForm.reservedDate} onChange={handleEditFormChange} placeholder="Reserved Date" type="date" style={{ padding: 8 }} />
                <input name="dateOrdered" value={editForm.dateOrdered} onChange={handleEditFormChange} placeholder="Date Ordered" type="date" style={{ padding: 8 }} />
                <input name="paymentAmount" value={editForm.paymentAmount} onChange={handleEditFormChange} placeholder="Payment Amount" type="number" min="0" style={{ padding: 8 }} />
                <input name="comment" value={editForm.comment} onChange={handleEditFormChange} placeholder="Comments" style={{ padding: 8 }} />
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 24, justifyContent: 'flex-end' }}>
                <button onClick={handleEditCancel} style={{ background: '#e2e8f0', color: '#2d3748', border: 'none', borderRadius: 6, padding: '8px 20px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleEditSave} style={{ background: '#3182ce', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default InvoicesPanel;