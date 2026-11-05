const express = require('express');
const app = express();
const http = require('http').createServer(app);
const { Server } = require('socket.io');
const io = new Server(http, {
    cors: { origin: "*" }
});

const { WebcastPushConnection } = require('tiktok-live-connector');

// Lưu danh sách phòng đang có rương real-time
let activeChests = new Map();

function monitorStream(username) {
    let cleanUser = username.replace('@', '').trim();
    let tiktokLiveConnection = new WebcastPushConnection(cleanUser);

    tiktokLiveConnection.connect().then(state => {
        console.log(`Đã kết nối phòng live: @${cleanUser}`);
    }).catch(err => {
        console.log(`Phòng @${cleanUser} không online.`);
    });

    // Lắng nghe sự kiện rương báu / túi xu
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
        activeChests.delete(cleanUser);
        io.emit('removeChest', cleanUser);
    });
}

// Danh sách các tài khoản TikTok mẫu cần canh quét
const targetStreamers = ['trum_live_vn', 'th_streamer_official'];
targetStreamers.forEach(user => monitorStream(user));

io.on('connection', (socket) => {
    console.log('Có thiết bị truy cập Web tool!');
    socket.emit('initChests', Array.from(activeChests.values()));

    socket.on('manualScan', (username) => {
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
    console.log(`Server Render đang chạy trên cổng ${PORT}`);
});
