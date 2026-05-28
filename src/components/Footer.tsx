export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">🚄</span>
          <span>台灣高鐵訂票系統</span>
        </div>
        <div className="footer-links">
          <a href="https://www.thsrc.com.tw" target="_blank" rel="noopener noreferrer">
            台灣高鐵官網
          </a>
          <span className="footer-divider">|</span>
          <a href="https://github.com/rickLHY/final-project-backend" target="_blank" rel="noopener noreferrer">
            Backend
          </a>
          <span className="footer-divider">|</span>
          <a href="https://github.com/rickLHY/final-project-frontend" target="_blank" rel="noopener noreferrer">
            Frontend
          </a>
        </div>
        <div className="footer-copy">
          © 2026 Database Final Project &nbsp;·&nbsp;
          圖片來源：
          <a href="https://commons.wikimedia.org/wiki/File:THSR_700T_train_at_THSR_Tainan_Station_20120726.jpg"
             target="_blank" rel="noopener noreferrer">
            Wikimedia Commons (CC BY-SA)
          </a>
        </div>
      </div>
    </footer>
  );
}
