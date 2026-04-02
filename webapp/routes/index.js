const { registerAuthenticationRoutes } = require("./authentication");
const { registerDashboardRoutes } = require("./dashboard");
const { registerPurchaseTicketRoutes} = require("./purchaseTicket");
const { registerQueriesRoutes } = require("./queries");
const { registerReportsRoutes } = require("./reports");
const { registerArtistRoutes } = require("./artist");
const { registerArtworkRoutes } = require("./artwork"); 
const { registerMembershipRoutes } = require("./membership");
const { registerExhibitionRoutes } = require("./exhibition");
const { registerAdmissionRoutes } = require("./admission");
const { registerGiftShopRoutes } = require("./giftShop");
const { registerCafeRoutes } = require("./cafe");


function registerRoutes(app, { pool }) {
    registerAuthenticationRoutes(app, { pool });
    registerDashboardRoutes(app, { pool });
    registerPurchaseTicketRoutes(app, { pool });
    registerQueriesRoutes(app, { pool });
    registerReportsRoutes(app, { pool });
    registerArtistRoutes(app, { pool });
    registerArtworkRoutes(app, { pool });
    registerMembershipRoutes(app, { pool });
    registerExhibitionRoutes(app, { pool });
    registerAdmissionRoutes(app, { pool });
    registerGiftShopRoutes(app, { pool });
    registerCafeRoutes(app, { pool });
}

module.exports = { registerRoutes };