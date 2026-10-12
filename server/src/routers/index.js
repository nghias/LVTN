const ChuTroRouter = require('./ChuTro');
const NguoiThueRouter = require('./NguoiThue');
const TaiKhoanRouter = require('./TaiKhoan');

function route(app){ 
    app.use('/chutro', ChuTroRouter);
    app.use('/nguoithue', NguoiThueRouter);
    app.use('/',TaiKhoanRouter);
    app.use((req, res)=>{
        res.status(404).render('layouts/error',{
            layout: 'error',
            title: '404 - Not Found',
            message: 'Không tìm thấy trang này.'
        });
    });
}

module.exports = route