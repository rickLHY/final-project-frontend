/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import type { MouseEvent } from 'react';
import type { Schedule, Station, Seat, AvailableSeat, TicketPrice, TicketType } from '../types';
import apiService from '../services/api';
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
      setError(err instanceof Error ? err.message : '載入座位資訊失敗');
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
        alert('最多只能選擇 6 張車票');
        return;
      }
      newSelected.set(seatId, ticketType);
    }
    setSelectedSeats(newSelected);
  };

  const getStartStation = () =>
    stations.find((s) => s.station_id === startStationId)?.station_name || '';
  const getEndStation = () =>
    stations.find((s) => s.station_id === endStationId)?.station_name || '';

  const handleConfirm = () => {
    if (selectedSeats.size === 0) {
      alert('請選擇至少一張座位');
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
    return <div className="loading">載入中...</div>;
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
        <h2>選擇座位</h2>
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
            <span className="seat-available">O</span> 可購票
          </div>
          <div>
            <span className="seat-occupied">X</span> 已售出
          </div>
          <div>
            <span className="seat-selected">✓</span> 已選擇
          </div>
        </div>

        {sortedCarriages.map((carriageNo) => (
          <div key={carriageNo} className="carriage">
            <h4>第 {carriageNo} 節車廂</h4>
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
                      onDeselect={() => selectedSeats.delete(seat.seat_id)}
                    />
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      <div className="booking-summary">
        <div className="summary-items">
          <p>已選擇座位: {selectedSeats.size} 張</p>
          <p className="total-price">總金額: NT$ {totalPrice.toLocaleString()}</p>
        </div>
        <div className="actions">
          <button onClick={onBack} className="btn-secondary">
            返回
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedSeats.size === 0}
            className="btn-primary"
          >
            確認購票 ({selectedSeats.size} 張)
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
        title={`${getSeatLabel()}${seat.is_business_class ? ' (商務車廂)' : ''}`}
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
              {getTicketTypeLabel(type)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function getTicketTypeLabel(type: TicketType): string {
  const labels: Record<TicketType, string> = {
    full: '全票',
    'early-bird': '早鳥',
    student: '大學生',
    elderly: '敬老',
    companion: '愛心',
    friend: '愛陪',
    child: '兒童',
  };
  return labels[type];
}
