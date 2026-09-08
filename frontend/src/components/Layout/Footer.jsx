export default function Footer() {
  return (
    <footer id="contact" className="bg-[#08150f] border-t border-white/5 px-6 py-10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-6">
        <div>
          <h4 className="text-lg font-bold mb-2">
            Grow<span className="text-emerald-400">TH</span>
          </h4>
          <p className="text-sm text-gray-400 max-w-md">
            Faculty of Engineering, Khon Kaen University — Digital Media
            Engineering Department
          </p>
          <p className="text-xs text-gray-500 mt-2 max-w-md">
            © 2026 GrowTH. Medical Disclaimer: this platform is for tracking
            purposes only and does not replace professional medical advice.
          </p>
        </div>
        <div className="flex gap-6 text-sm text-gray-300 items-start md:items-center">
          <a href="#" className="hover:text-emerald-400">Privacy Policy</a>
          <a href="#" className="hover:text-emerald-400">Contact Support</a>
        </div>
      </div>
    </footer>
  );
}

