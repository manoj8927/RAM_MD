// RAM-MD visual hacking simulation. No hacking, data access, or network scans.
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  name: 'hack-prank',
  command: ['hack'],
  menu: ['hack'],
  category: 'Games',
  desc: 'Owner-only fictional hacking animation: .hack',
  owner: true,
  async run({ reply, text }) {
    const target = String(text || '').trim().slice(0, 35).replace(/[\r\n*_`~]/g, '');
    const heading = '🎮 *RAM-MD | HACK PRANK SIMULATOR*';
    const steps = [
      ['0%', 'Initializing fake terminal'],
      ['18%', 'Connecting to imaginary server'],
      ['42%', 'Generating random codes'],
      ['67%', 'Decrypting fictional files'],
      ['89%', 'Rendering simulation'],
      ['100%', 'Prank completed'],
    ];
    await reply(heading + '\n\n⚠️ *PRANK / SIMULATION ONLY*\nNo device, account or data is accessed.' +
      (target ? '\n🎯 Label: ' + target : ''));
    for (const [percent, label] of steps) {
      await sleep(850);
      const value = parseInt(percent, 10);
      const filled = Math.round(value / 10);
      await reply('💻 *SIMULATION*\n[' + '█'.repeat(filled) + '░'.repeat(10 - filled) +
        '] ' + percent + '\n' + label);
    }
    await reply('😂 *GOTCHA! IT WAS A PRANK!*\n\n' +
      '🔒 No hacking happened. No chats, photos, passwords or files were accessed.\n' +
      '⚡ Powered by RAM-MD');
  },
};
