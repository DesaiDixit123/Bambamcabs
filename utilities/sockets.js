const io = require("socket.io")();
const socketapi = { io: io };
module.exports.server = socketapi;
io.on("connection", function (client) {
  client.on('init', async function (data) {
    client.join(data.channelid);
  });
});
// Outgoing Events
module.exports.onuserlogin = (channelID, reqData) => {
  io.emit(channelID, { event: 'onuserlogin', data: reqData });
};
module.exports.onroombooking = (channelID, reqData) => {
  io.emit(channelID, { event: 'onroombooking', data: reqData });
};
module.exports.onamenitiesbooking = (channelID, reqData) => {
  io.emit(channelID, { event: 'onamenitiesbooking', data: reqData });
};
module.exports.onnewannouncement = (channelID, reqData) => {
  io.emit(channelID, { event: 'onnewannouncement', data: reqData });
};
module.exports.onroombookingcancelled = (channelID, reqData) => {
  io.emit(channelID, { event: 'onroombookingcancelled', data: reqData });
};
module.exports.onamenitiesbookingcancelled = (channelID, reqData) => {
  io.emit(channelID, { event: 'onamenitiesbookingcancelled', data: reqData });
};

