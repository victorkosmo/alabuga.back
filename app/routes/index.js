// Import route files
const webRouter = require('./webRoutes/index');
const adminRouter = require('./adminRoutes/index');
const tmaRouter = require('./tmaRoutes/index');

const setupRoutes = (app) => {
    // Health check 
    app.get('/', (req, res, next) => {
        res.locals.data = { 
            message: "API is up and running", 
            timestamp: new Date().toISOString() 
        };
        next();
    });

    // Register route groups
    app.use('/web', webRouter);
    app.use('/admin', adminRouter); 
    app.use('/telegram', tmaRouter);
};

module.exports = setupRoutes;
