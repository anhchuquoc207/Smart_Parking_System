// 1. DATA GIẢ LẬP (MOCK DATA)
const mockData = {
    user: { name: "Nguyen Van Quan", balance: 50000 },
    session: { fee: 5000, isPaid: false }
};

// 2. GỌI CÁC PHẦN TỬ GIAO DIỆN
const screenHome = document.getElementById('screen-home');
const screenPayment = document.getElementById('screen-payment');
const btnPayNow = document.getElementById('btn-pay-now');
const btnBack = document.getElementById('btn-back');
const btnConfirmPay = document.getElementById('btn-confirm-pay');
const balanceDisplay = document.getElementById('user-balance');

// Hàm Format tiền tệ cho đẹp (VD: 50000 -> 50,000)
function formatCurrency(amount) {
    return amount.toLocaleString() + " VND";
}

// Hàm cập nhật số dư ra màn hình HTML
function updateUI() {
    balanceDisplay.innerText = "BKPay Balance: " + formatCurrency(mockData.user.balance);
}

// Chạy lần đầu tiên khi mở web
updateUI();

// 3. LOGIC CHUYỂN TRANG
btnPayNow.addEventListener('click', () => {
    screenHome.classList.replace('active', 'hidden');
    screenPayment.classList.replace('hidden', 'active');
});

btnBack.addEventListener('click', () => {
    screenPayment.classList.replace('active', 'hidden');
    screenHome.classList.replace('hidden', 'active');
});

// 4. LOGIC THANH TOÁN (Trừ tiền)
btnConfirmPay.addEventListener('click', () => {
    if (mockData.session.isPaid) {
        alert("Bạn đã thanh toán vé xe này rồi!");
        return;
    }

    if (mockData.user.balance >= mockData.session.fee) {
        // Trừ tiền
        mockData.user.balance -= mockData.session.fee;
        mockData.session.isPaid = true;
        
        // Cập nhật giao diện số dư mới
        updateUI();
        
        // Đổi màu nút Pay Now trên trang chủ thành màu Xám báo hiệu đã xong
        btnPayNow.style.backgroundColor = "#6C757D";
        btnPayNow.innerText = "PAID";
        
        alert("Thành công! Cổng ra đã được mở.");
        
        // Tự động đẩy người dùng về lại trang chủ
        btnBack.click();
    } else {
        alert("Thất bại! Số dư ví BKPay không đủ.");
    }
});