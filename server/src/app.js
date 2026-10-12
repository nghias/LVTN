require('dotenv').config();
const express = require("express");
const path = require('path');
const route = require("./routers");
const session = require("express-session");
const methodOverride = require('method-override');
const helmet = require('helmet');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const PORT = process.env.PORT || 3000;


const app = express();


const server = http.createServer(app);
const io = new Server(server);

io.on('connection', (socket) => {
//   console.log('Có người kết nối socket:', socket.id);
  socket.on('dang_nhap_he_thong', (userId) => {
      if (userId) {
          const roomName = 'PhongTroChuyen_' + userId;
          socket.join(roomName);
        //   console.log(`User ${userId} đã join vào phòng: ${roomName}`);
      }
  });
});

app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
    next();
});
    
app.enable('trust proxy');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24
    }
}));
app.use((req, res, next) => {
    res.locals.MaND = req.session.NguoiDung?.MaND || null;
    res.locals.Quyen = req.session.NguoiDung?.Quyen || null;
    res.locals.ThongTin = req.session.NguoiDung?.ThongTin || null;
    next();
});

app.use(helmet());

app.use(methodOverride('_method'));

app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: 1000 * 60 * 60 * 24, 
    etag: true,
    lastModified: true
}));

app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use(cors({ origin: 'http://localhost:3000' }));

route(app);

server.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
