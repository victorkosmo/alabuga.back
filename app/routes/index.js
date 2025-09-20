// Import route files
const authRouter = require('./webRoutes/auth/index');
const boilerplateRouter = require('./webRoutes/boilerplate_entity/index');
const adminRouter = require('./adminRoutes/index');

const setupRoutes = (app) => {
    // Health check 
    app.get('/', (req, res, next) => {
        res.locals.data = { 
            message: "API is up and running", 
            timestamp: new Date().toISOString() 
        };
        next();
    });

    // Register routes
    app.use('/auth', authRouter);
    app.use('/boilerplate_entity', boilerplateRouter);
    app.use('/admin', adminRouter);
};

module.exports = setupRoutes;
