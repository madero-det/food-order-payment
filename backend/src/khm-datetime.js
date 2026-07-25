export function khmDate() {
  return new Date().toLocaleString('en-CA', { timeZone: 'Asia/Phnom_Penh' }).split(',')[0];
}

export function khmDateTime() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Phnom_Penh' }).replace('T', ' ').substring(0, 19);
}

export function khmNow() {
  return new Date().toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true });
}

export function khmMonth() {
  return new Date().toLocaleString('en-CA', { timeZone: 'Asia/Phnom_Penh' }).split(',')[0].split('-')[1];
}

export function khmYear() {
  return new Date().toLocaleString('en-CA', { timeZone: 'Asia/Phnom_Penh' }).split(',')[0].split('-')[0];
}
