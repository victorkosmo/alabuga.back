// Import route files
const webRouter = require('./webRoutes/index');
const adminRouter = require('./adminRoutes/index');
const tmaRouter = require('./tmaRoutes/index');
const apiRouter = require('./apiRoutes/index')

const setupRoutes = (app) => {
    // Health check 
    app.get('/', (req, res, next) => {
        res.locals.data = { 
            message: "API is up and running", 
            timestamp: new Date().toISOString() 
        };
        next();
    });
    app.use('/web', webRouter);
    app.use('/admin', adminRouter); 
    app.use('/telegram', tmaRouter);
    app.use('/api', apiRouter)
};

module.exports = setupRoutes;
