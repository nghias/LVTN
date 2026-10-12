class ChuanHoa {
    /**
     *
     * @param {Date | string} dateInput
     * @returns {string}
     */
    static ThanhDDMMYYYY(dateInput) {
        let date;

        if (typeof dateInput === 'string') date = new Date(dateInput);
        else if (dateInput instanceof Date) date = dateInput;
        else date = new Date(); 

        if (isNaN(date.getTime())) return "Ngày không hợp lệ";

        const day = date.getDate();
        const month = date.getMonth() + 1; 
        const year = date.getFullYear();

        const formattedDay = String(day).padStart(2, '0');
        const formattedMonth = String(month).padStart(2, '0');
        
        return `${formattedDay}/${formattedMonth}/${year}`;
    }
    static ThanhNgay(dateStr) {
        if (dateStr instanceof Date) return dateStr;
        
        if (!dateStr) return null;

        let year, month, day;

        if (dateStr.includes('-')) [year, month, day] = dateStr.split('-');
        else [day, month, year] = dateStr.split('/');

        return new Date(year, month - 1, day);
    }

    static SoSanhThangVaNam(dateStr1, dateStr2) {
        if (dateStr1.getMonth() === dateStr2.getMonth() && dateStr1.getFullYear() === dateStr2.getFullYear()) {
            return true; 
        } else return false; 
    }
}
module.exports={ChuanHoa};