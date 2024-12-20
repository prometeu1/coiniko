# 🌟 **Coiniko** - Your Gateway to Cryptocurrencies 🌍

## 🎯 **Pitch**

**Coiniko** is an interactive platform that simplifies cryptocurrency tracking by providing real-time data in an intuitive and visually appealing way.  
"With Coiniko, dive into the world of cryptocurrencies and stay informed effortlessly with accurate and up-to-date information."

---

## 📋 **Description**

**What is Coiniko?**  
Coiniko is a sleek and user-friendly platform for tracking cryptocurrency prices, market caps, and trading volumes. It empowers users by providing detailed insights into market trends and facilitating smarter decisions.  

**Why is it useful?**  
Cryptocurrency data can be overwhelming. Coiniko organizes and presents the data in a way that's easy to understand, saving time and effort.  

**Who are the users?**  
- Crypto enthusiasts 🌟  
- Traders looking for real-time market insights 📊  
- Anyone curious about cryptocurrency trends 🚀  

---

## 🚀 **Features**

- [x] **Dynamic Search**: Quickly find information about specific cryptocurrencies.  
- [x] **Real-Time Data**: Prices, changes, market caps, and trading volumes powered by the CoinMarketCap API.  
- [x] **Interactive Data Table**: Sort and filter cryptocurrency data effortlessly.  
- [x] **Light/Dark Mode**: Toggle between themes for better readability.  
- [ ] **Advanced Analytics** (coming soon): Insights into historical trends and predictions.  

---

## 🛠️ **Stack Technique**

- **Front-end:** Next.js, TypeScript, Tailwind CSS  
- **Back-end:** Integration with CoinMarketCap API  
- **Deployment:** Vercel  
- **Libraries:**  
  - **UI Components:** Lucide Icons, TanStack Table  
  - **Styling:** Tailwind CSS with dark mode support  

---

## 🛠️ **Installation & Setup**
To set up and run Coiniko locally:

```bash
# Clone the repository
git clone https://github.com/prometeu1/coiniko.git

# Navigate to the project directory
cd coiniko

# Install dependencies
npm install

# Start the development server
npm run dev

# Build for production
npm run build
```

---

### 🌐 **Environment Variables**
To use Coiniko locally, you need to configure the **CoinMarketCap API key**. Follow these steps:

1. Create a `.env.local` file in the root directory of the project:
   ```plaintext
   NEXT_PUBLIC_CMC_API_KEY=YOUR_API_KEY_HERE
   ```

2. Replace `YOUR_API_KEY_HERE` with your CoinMarketCap API key.

3. **How to Get a CoinMarketCap API Key**:
   - Visit the [CoinMarketCap API](https://coinmarketcap.com/api/) website.
   - **Sign up for a free account** if you don’t already have one.
   - Navigate to **Overview** or **DEX Overview** in the API section of your account.
   - Copy the provided API key and paste it into your `.env.local` file.

---

## 🗺️ **Roadmap**

- Add advanced analytics and portfolio management.
- Expand API integration for more insights.
- Mobile responsiveness and PWA support.

---

## 📜 **Licence**

This project is licensed under the MIT License.

---

## ✍️ **Auteurs**

- **Kevin**: Lead Developer, Designer  
- **Contributors**: Open for collaboration  


