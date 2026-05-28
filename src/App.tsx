import { useEffect, useState } from 'react';
import './styles/globals.css';
import './App.css';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import './styles/Footer.css';
import { useAuth } from './contexts/AuthContext';
import apiService from './services/api';
import { AuthPage } from './pages/AuthPage';
import { SearchPage, type SearchSelection } from './pages/SearchPage';
import { SeatSelection, type TicketInfo } from './pages/SeatSelection';
import { BookingConfirm } from './pages/BookingConfirm';
import { PaymentPage } from './pages/PaymentPage';
import { MyBookings } from './pages/MyBookings';
import { WaitlistPage } from './pages/Waitlist';
import { NonReservedPage } from './pages/NonReservedPage';
import { PeakSalesPage } from './pages/PeakSalesPage';
import type { Order, Schedule, Station } from './types';

export type AppPage = 'search' | 'seats' | 'confirm' | 'payment' | 'orders' | 'waitlist' | 'non-reserved' | 'peak-sales';

function App() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<AppPage>('search');
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [searchSelection, setSearchSelection] = useState<SearchSelection | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<TicketInfo[]>([]);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [stationError, setStationError] = useState<string | null>(null);

  useEffect(() => {
    apiService
      .getStations()
      .then((data) => {
        setStations([...data].sort((a, b) => a.sequence_no - b.sequence_no));
        setStationError(null);
      })
      .catch((err) => {
        setStationError(err instanceof Error ? err.message : '載入車站資料失敗');
      });
  }, []);

  const handleSelectSchedule = (schedule: Schedule, selection: SearchSelection) => {
    setSelectedSchedule(schedule);
    setSearchSelection(selection);
    setSelectedTickets([]);
    setCreatedOrder(null);
    setPage('seats');
  };

  const handleConfirmSeats = (tickets: TicketInfo[]) => {
    setSelectedTickets(tickets);
    setPage('confirm');
  };

  const handleOrderCreated = (order: Order) => {
    setCreatedOrder(order);
    setPage('payment');
  };

  const handlePaymentSuccess = (order: Order) => {
    setCreatedOrder(order);
    setSelectedSchedule(null);
    setSelectedTickets([]);
    setPage('orders');
  };

  const renderPage = () => {
    if (stationError) {
      return <div className="error-message">{stationError}</div>;
    }

    if (page === 'search') {
      return <SearchPage onSelectSchedule={handleSelectSchedule} onNavigate={setPage} />;
    }

    if (page === 'seats' && selectedSchedule && searchSelection) {
      return (
        <SeatSelection
          schedule={selectedSchedule}
          startStationId={searchSelection.startStationId}
          endStationId={searchSelection.endStationId}
          stations={stations}
          onConfirm={handleConfirmSeats}
          onBack={() => setPage('search')}
        />
      );
    }

    if (page === 'confirm' && selectedSchedule && selectedTickets.length > 0) {
      return (
        <BookingConfirm
          tickets={selectedTickets}
          scheduleId={selectedSchedule.schedule_id}
          onConfirm={handleOrderCreated}
          onBack={() => setPage('seats')}
        />
      );
    }

    if (page === 'payment' && createdOrder) {
      return (
        <PaymentPage
          order={createdOrder}
          onPaymentSuccess={handlePaymentSuccess}
          onBack={() => setPage('confirm')}
        />
      );
    }

    if (page === 'orders') {
      return <MyBookings stations={stations} />;
    }

    if (page === 'waitlist') {
      return <WaitlistPage stations={stations} />;
    }

    if (page === 'non-reserved') {
      return <NonReservedPage stations={stations} />;
    }

    if (page === 'peak-sales') {
      return <PeakSalesPage />;
    }

    return <SearchPage onSelectSchedule={handleSelectSchedule} />;
  };

  if (loading) {
    return <div className="app-loading">載入會員狀態...</div>;
  }

  if (!user) {
    return <AuthPage onSuccess={() => setPage('search')} />;
  }

  return (
    <div className="app">
      <Header currentPage={page} onNavigate={setPage} />
      <main className="page-container">{renderPage()}</main>
      <Footer />
    </div>
  );
}

export default App;
