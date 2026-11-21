module.exports = {
  name: 'reload',
  command: ['reload'],
  category: 'Settings',
  desc: 'Reload all plugins without restarting',
  owner: true,
  async run({ reloadPlugins, reply }) {
    reloadPlugins();
    await reply('Plugins reloaded.');
  },
};
