const express = require('express');
const app = express();
const http = require('http').createServer(app);
const { Server } = require('socket.io');
const io = new Server(http, {
    cors: { origin: "*" }
});

const TikTokLiveConnector = require('tiktok-live-connector');
const WebcastPushConnection = TikTokLiveConnector.WebcastPushConnection || TikTokLiveConnector;

// Lưu trữ danh sách phòng đang có rương real-time
let activeChests = new Map();

// Hàm kết nối và quét rương của 1 tài khoản TikTok đang Live
function monitorStream(username) {
    let cleanUser = username.replace('@', '').trim();
    let tiktokLiveConnection = new WebcastPushConnection(cleanUser);

    tiktokLiveConnection.connect().then(state => {
        console.log(`Đã kết nối thành công phòng live: @${cleanUser} (Room ID: ${state.roomId})`);
    }).catch(err => {
        console.log(`Phòng @${cleanUser} không online hoặc lỗi kết nối.`);
    });

    // Lắng nghe sự kiện rương báu / túi xu xuất hiện trong phiên live
    tiktokLiveConnection.on('treasureBox', data => {
        console.log(`[RƯƠNG XU MỚI] Từ @${cleanUser}:`, data);
        
        const chestInfo = {
            id: cleanUser,
            username: cleanUser,
            avatar: `https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/${cleanUser}.jpeg`,
            coins: data.coins || 100,
            timeLeft: data.duration || 180
        };

        activeChests.set(cleanUser, chestInfo);
        io.emit('newChest', chestInfo);
    });

    tiktokLiveConnection.on('streamEnd', () => {
        console.log(`Phòng @${cleanUser} đã tắt live.`);
        activeChests.delete(cleanUser);
        io.emit('removeChest', cleanUser);
    });
}

// Danh sách các username TikTok đang live mẫu
const targetStreamers = ['trum_live_vn', 'th_streamer_official'];
targetStreamers.forEach(user => {
    monitorStream(user);
});

io.on('connection', (socket) => {
    console.log('Có người dùng truy cập vào Web tool!');
    socket.emit('initChests', Array.from(activeChests.values()));

    socket.on('manualScan', (username) => {
        console.log(`Nhận yêu cầu quét thủ công phòng: ${username}`);
        monitorStream(username);
        
        const testChest = {
            id: username.replace('@', '').trim(),
            username: username.replace('@', '').trim(),
            avatar: 'https://i.pravatar.cc/100?img=12',
            coins: 300,
            timeLeft: 150
        };
        io.emit('newChest', testChest);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server Backend quét rương đang chạy trên cổng ${PORT}`);
});
