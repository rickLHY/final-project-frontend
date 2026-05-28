/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import type { MouseEvent } from 'react';
import type { Schedule, Station, Seat, AvailableSeat, TicketPrice, TicketType } from '../types';
import apiService from '../services/api';
import { useI18n } from '../i18n';
import '../styles/SeatSelection.css';

interface SeatSelectionProps {
  schedule: Schedule;
  startStationId: number;
  endStationId: number;
  stations: Station[];
  onConfirm: (tickets: TicketInfo[]) => void;
  onBack: () => void;
}

export interface TicketInfo {
  seatId: number;
  ticketType: TicketType;
  startStationId: number;
  endStationId: number;
  price: number;
}

export function SeatSelection({
  schedule,
  startStationId,
  endStationId,
  stations,
  onConfirm,
  onBack,
}: SeatSelectionProps) {
  const [availableSeats, setAvailableSeats] = useState<AvailableSeat[]>([]);
  const [allSeats, setAllSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<Map<number, TicketType>>(new Map());
  const [ticketPrices, setTicketPrices] = useState<TicketPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  const loadData = async () => {
    try {
      setLoading(true);
      const [available, seats, prices] = await Promise.all([
        apiService.getAvailableSeats(schedule.schedule_id, startStationId, endStationId),
        apiService.getSeats(),
        apiService.getTicketPrices(),
      ]);

      setAvailableSeats(available);
      setAllSeats(seats);
      setTicketPrices(prices);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('searchFailed'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schedule.schedule_id]);

  const getBasePrice = (isBusinessClass: boolean): number => {
    const price = ticketPrices.find(
      (p) =>
        p.start_station_id === startStationId &&
        p.end_station_id === endStationId &&
        p.is_business === isBusinessClass
    );
    return price?.base_price || 0;
  };

  const getDiscountedPrice = (basePrice: number, ticketType: TicketType): number => {
    const discounts: Record<TicketType, number> = {
      full: 1,
      'early-bird': 0.8, // Will be overridden by API
      student: 0.8,
      elderly: 0.8,
      companion: 0.5,
      friend: 0.5,
      child: 0.5,
    };
    return Math.round(basePrice * (discounts[ticketType] || 1));
  };

  const toggleSeat = (seatId: number, ticketType: TicketType) => {
    const newSelected = new Map(selectedSeats);
    if (newSelected.has(seatId)) {
      newSelected.delete(seatId);
    } else {
      if (newSelected.size >= 6) {
        alert(t('confirmPurchase', { count: 6 }));
        return;
      }
      newSelected.set(seatId, ticketType);
    }
    setSelectedSeats(newSelected);
  };

  const deselectSeat = (seatId: number) => {
    const newSelected = new Map(selectedSeats);
    newSelected.delete(seatId);
    setSelectedSeats(newSelected);
  };

  const getStartStation = () =>
    stations.find((s) => s.station_id === startStationId)?.station_name || '';
  const getEndStation = () =>
    stations.find((s) => s.station_id === endStationId)?.station_name || '';

  const handleConfirm = () => {
    if (selectedSeats.size === 0) {
      alert(t('chooseSeats'));
      return;
    }

    const tickets: TicketInfo[] = Array.from(selectedSeats.entries()).map(([seatId, ticketType]) => {
      const seat = allSeats.find((s) => s.seat_id === seatId);
      const basePrice = getBasePrice(seat?.is_business_class || false);
      const price = getDiscountedPrice(basePrice, ticketType);

      return {
        seatId,
        ticketType,
        startStationId,
        endStationId,
        price,
      };
    });

    onConfirm(tickets);
  };

  if (loading) {
    return <div className="loading">{t('loading')}</div>;
  }

  // Group seats by carriage
  const seatsByCarriage: Record<number, Seat[]> = {};
  allSeats.forEach((seat) => {
    if (!seatsByCarriage[seat.carriage_no]) {
      seatsByCarriage[seat.carriage_no] = [];
    }
    seatsByCarriage[seat.carriage_no].push(seat);
  });

  const sortedCarriages = Object.keys(seatsByCarriage)
    .map(Number)
    .sort((a, b) => a - b);

  const totalPrice = Array.from(selectedSeats.entries()).reduce((sum, [seatId, ticketType]) => {
    const seat = allSeats.find((s) => s.seat_id === seatId);
    const basePrice = getBasePrice(seat?.is_business_class || false);
    const price = getDiscountedPrice(basePrice, ticketType);
    return sum + price;
  }, 0);

  return (
    <div className="seat-selection-container">
      <div className="header-info">
        <h2>{t('chooseSeats')}</h2>
        <div className="route-info">
          <span>{getStartStation()}</span>
          <span>→</span>
          <span>{getEndStation()}</span>
          <span>({schedule.departure_date})</span>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="seat-selection">
        <div className="legend">
          <div>
            <span className="seat-available">O</span> {t('available')}
          </div>
          <div>
            <span className="seat-occupied">X</span> {t('occupied')}
          </div>
          <div>
            <span className="seat-selected">✓</span> {t('selected')}
          </div>
        </div>

        {sortedCarriages.map((carriageNo) => (
          <div key={carriageNo} className="carriage">
            <h4>{t('carriage', { no: carriageNo })}</h4>
            <div className="seats-grid">
              {seatsByCarriage[carriageNo]
                .sort((a, b) => (a.row_no !== b.row_no ? a.row_no - b.row_no : a.seat_letter.localeCompare(b.seat_letter)))
                .map((seat) => {
                  const isAvailable = availableSeats.some((as) => as.seat_id === seat.seat_id);
                  const isSelected = selectedSeats.has(seat.seat_id);

                  return (
                    <SeatButton
                      key={seat.seat_id}
                      seat={seat}
                      isAvailable={isAvailable}
                      isSelected={isSelected}
                      selectedType={selectedSeats.get(seat.seat_id)}
                      onSelect={(ticketType) => toggleSeat(seat.seat_id, ticketType)}
                      onDeselect={() => deselectSeat(seat.seat_id)}
                    />
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      <div className="booking-summary">
        <div className="summary-items">
          <p>{t('selectedSeatCount', { count: selectedSeats.size })}</p>
          <p className="total-price">{t('totalAmount')}: NT$ {totalPrice.toLocaleString()}</p>
        </div>
        <div className="actions">
          <button onClick={onBack} className="btn-secondary">
            {t('back')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedSeats.size === 0}
            className="btn-primary"
          >
            {t('confirmPurchase', { count: selectedSeats.size })}
          </button>
        </div>
      </div>
    </div>
  );
}

interface SeatButtonProps {
  seat: Seat;
  isAvailable: boolean;
  isSelected: boolean;
  selectedType?: TicketType;
  onSelect: (ticketType: TicketType) => void;
  onDeselect: () => void;
}

function SeatButton({ seat, isAvailable, isSelected, onSelect, onDeselect }: SeatButtonProps) {
  const [showTicketType, setShowTicketType] = useState(false);
  const { t } = useI18n();

  const ticketTypeOptions: TicketType[] = ['full', 'student', 'elderly', 'companion', 'child'];

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (isSelected) {
      onDeselect();
      setShowTicketType(false);
    } else if (isAvailable) {
      setShowTicketType(true);
    }
  };

  const handleSelectType = (ticketType: TicketType) => {
    onSelect(ticketType);
    setShowTicketType(false);
  };

  const getSeatLabel = () => {
    if (seat.row_no < 10) {
      return `0${seat.row_no}${seat.seat_letter}`;
    }
    return `${seat.row_no}${seat.seat_letter}`;
  };

  return (
    <div className="seat-button-wrapper">
      <button
        className={`seat-button ${isAvailable ? 'available' : 'occupied'} ${isSelected ? 'selected' : ''} ${seat.is_business_class ? 'business' : ''}`}
        onClick={handleClick}
        disabled={!isAvailable && !isSelected}
        title={`${getSeatLabel()}${seat.is_business_class ? ` (${t('business')})` : ''}`}
      >
        {isSelected ? '✓' : isAvailable ? 'O' : 'X'}
      </button>
      {showTicketType && (
        <div className="ticket-type-menu">
          {ticketTypeOptions.map((type) => (
            <button
              key={type}
              onClick={() => handleSelectType(type)}
              className="ticket-type-option"
            >
              {t(type)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
