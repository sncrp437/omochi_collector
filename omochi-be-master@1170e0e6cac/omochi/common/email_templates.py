from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class EmailTemplateService:
    """
    Service for generating email templates on the backend.
    """
    
    def generate_email_content(
        self, 
        email_type: str, 
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate email content based on email type and data.
        
        Args:
            email_type: Type of email to generate
            data: Data for template rendering
            
        Returns:
            Dict containing subject, html_content, plain_content, cc, bcc
        """
        try:
            if email_type == 'password_reset':
                return self._generate_password_reset_email(data)
            elif email_type == 'invoice':
                return self._generate_invoice_email(data)
            else:
                raise ValueError(f'Unknown email type: {email_type}')
                
        except Exception as e:
            logger.error(f"Error generating email content for type {email_type}: {str(e)}")
            raise
    
    def _generate_password_reset_email(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate password reset email content. Supports multilingual (ja/en) via 'language' in data."""
        reset_link = data['reset_link']
        timeout = data.get('timeout', 10)  # minutes, default 10
        language = data.get('language', 'ja')
        admin_email = data.get('admin_email', 'info@omochiapp.com')
        if language == 'en':
            subject = "[Omochi] Password Reset Notification"
            html_content = f"""
                <p>Thank you for using our service.<br>
                We have received a request to reset your password.<br>
                <br>
                Please click the link below to set a new password.<br>
                (The link is valid for {timeout} minutes)<br>
                <br>
                ▼ Password Reset Link<br>
                <a href='{reset_link}'>{reset_link}</a><br>
                <br>
                If you have any questions about changing your password or accessing your account,<br>
                please contact us at <a href='mailto:{admin_email}'>{admin_email}</a>.<br>
                <br>
                Thank you very much for your cooperation.</p>
            """
            plain_content = f"""
                Thank you for using our service.
                We have received a request to reset your password.

                Please click the link below to set a new password.
                (The link is valid for {timeout} minutes)

                ▼ Password Reset Link
                {reset_link}

                If you have any questions about changing your password or accessing your account,
                please contact us at {admin_email}.

                Thank you very much for your cooperation.
            """
        else:
            subject = "【Omochi】パスワード再設定のお知らせ"
            html_content = f"""
                ご利用いただきありがとうございます。<br>
                パスワードの再設定をリクエストいただきました。<br>
                <br>
                以下のリンクをクリックして、新しいパスワードを設定してください。<br>
                （リンクの有効期限は {timeout}分です）<br>
                <br>
                ▼パスワード再設定リンク<br>
                <a href='{reset_link}'>{reset_link}</a><br>
                <br>
                パスワードの変更やアクセスに関してご不明な点がある場合、<br>
                お手数ではございますが <a href='mailto:{admin_email}'>{admin_email}</a> までご連絡ください。<br>
                <br>
                何卒よろしくお願いいたします。
            """
            plain_content = f"""
                ご利用いただきありがとうございます。
                パスワードの再設定をリクエストいただきました。

                以下のリンクをクリックして、新しいパスワードを設定してください。
                （リンクの有効期限は {timeout}分です）

                ▼パスワード再設定リンク
                {reset_link}

                パスワードの変更やアクセスに関してご不明な点がある場合、
                お手数ではございますが {admin_email} までご連絡ください。

                何卒よろしくお願いいたします。
            """
        return {
            'subject': subject,
            'html_content': html_content,
            'plain_content': plain_content,
            'cc': data.get('cc', []),
            'bcc': data.get('bcc', [])
        }
    
    def _generate_invoice_email(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate invoice email content with detailed Japanese format."""
        invoice_data = data['invoice']
        
        # Extract invoice data
        invoice_number = invoice_data.get('invoice_number', '123456')
        order_date = invoice_data.get('order_date', '2025年5月23日')
        customer_name = invoice_data.get('customer_name', 'お客様')
        venue_name = invoice_data.get('venue_name', '店舗名')
        payment_method = invoice_data.get('payment_method', 'Stripe')
        order_type = invoice_data.get('order_type', 'takeout')  # 'takeout' or 'eat_in'
        
        # Generate subject based on order type
        if order_type == 'takeout':
            subject = f"【Omochi】テイクアウトのご注文領収書（注文ID: #{invoice_number}）"
        else:  # eat_in
            subject = f"【Omochi】ご来店予約の領収書（注文ID: #{invoice_number}）"
        
        # Order items
        items = invoice_data.get('items', [])
        venue_subtotal = invoice_data.get('venue_subtotal')
        venue_coupon_discount = invoice_data.get('venue_coupon_discount')
        
        # Omochi service fees (only for takeout)
        service_fee_pretax = invoice_data.get('service_fee_pretax')
        omochi_coupon_discount = invoice_data.get('omochi_coupon_discount')
        service_tax = invoice_data.get('service_tax', 12)
        service_fee_total = invoice_data.get('service_fee_total')
        
        total_amount = invoice_data.get('total_amount')
        
        # Build order items HTML
        items_html = ""
        for item in items:
            items_html += f"""
            <tr>
                <td>{item.get('name', '')}</td>
                <td style="text-align: center;">× {item.get('quantity', 1)}</td>
                <td style="text-align: right;">¥{item.get('price', 0):,} (税込み)</td>
            </tr>
            """
        
        # Service fee section (only for takeout)
        service_fee_section = ""
        if order_type == 'takeout':
            service_fee_section = f"""
            <div class="section-divider">ーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーー</div>
            <h3>Omochiサービス利用料（株式会社セレンディピティ）</h3>
            <table class="invoice-table">
                <tr>
                    <td>サービス利用料（税抜）</td>
                    <td style="text-align: right;">¥{service_fee_pretax:,}</td>
                </tr>
                <tr>
                    <td>消費税（10%）</td>
                    <td style="text-align: right;">¥{service_tax:,}</td>
                </tr>
                <tr>
                    <td>▼ Omochiクーポン適用割引:</td>
                    <td style="text-align: right;">-¥{omochi_coupon_discount:,}</td>
                </tr>
                <tr class="subtotal">
                    <td><strong>小計（税込）:</strong></td>
                    <td style="text-align: right;"><strong>¥{service_fee_total:,}</strong></td>
                </tr>
            </table>
            """
        
        # Additional notes for takeout vs eat-in
        additional_notes = ""
        if order_type == 'takeout':
            additional_notes = """
            <li>※Omochiサービス利用料については、株式会社セレンディピティが適格請求書発行事業者として発行しております。</li>
            """
        
        # Tax registration number (only for takeout)
        tax_registration = ""
        if order_type == 'takeout':
            tax_registration = "<p>適格請求書発行事業者登録番号: T4010601064331</p>"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{subject}</title>
            <style>
                body {{ 
                    font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Meiryo', sans-serif; 
                    line-height: 1.6; 
                    color: #333; 
                    margin: 0;
                    padding: 20px;
                }}
                .container {{ 
                    max-width: 700px; 
                    margin: 0 auto; 
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    overflow: hidden;
                }}
                .header {{ 
                    background-color: #2c3e50; 
                    color: white;
                    padding: 30px 20px; 
                    text-align: center; 
                }}
                .header h1 {{ 
                    margin: 0; 
                    font-size: 28px;
                    font-weight: bold;
                }}
                .content {{ 
                    padding: 30px; 
                }}
                .invoice-info {{ 
                    background-color: #f8f9fa; 
                    padding: 20px; 
                    border-radius: 5px; 
                    margin: 20px 0; 
                }}
                .invoice-table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin: 15px 0;
                }}
                .invoice-table td {{
                    padding: 8px 12px;
                    border-bottom: 1px solid #eee;
                }}
                .invoice-table .subtotal td {{
                    border-top: 2px solid #333;
                    padding-top: 12px;
                    font-weight: bold;
                }}
                .section-divider {{
                    margin: 20px 0;
                    font-family: monospace;
                    color: #666;
                    text-align: center;
                }}
                .total-amount {{
                    background-color: #e8f5e8;
                    padding: 15px;
                    border-radius: 5px;
                    text-align: center;
                    margin: 20px 0;
                }}
                .total-amount .amount {{
                    font-size: 24px;
                    font-weight: bold;
                    color: #27ae60;
                }}
                .company-info {{
                    background-color: #f1f2f6;
                    padding: 20px;
                    border-radius: 5px;
                    margin: 25px 0;
                }}
                .notes {{
                    font-size: 12px;
                    color: #666;
                    background-color: #f8f9fa;
                    padding: 15px;
                    border-radius: 5px;
                    margin-top: 20px;
                }}
                .notes ul {{
                    margin: 0;
                    padding-left: 20px;
                }}
                .notes li {{
                    margin-bottom: 5px;
                }}
                h2 {{ color: #2c3e50; margin-top: 0; }}
                h3 {{ color: #34495e; margin: 15px 0 10px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>領収書</h1>
                    <p style="margin: 10px 0 0 0; font-size: 18px;">Omochi</p>
                </div>
                <div class="content">
                    <div class="invoice-info">
                        <p><strong>領収書番号:</strong> #{invoice_number}</p>
                        <p><strong>取引日:</strong> {order_date}</p>
                        <p><strong>ご注文者様:</strong> {customer_name}</p>
                        <p><strong>店舗名:</strong> {venue_name}</p>
                        <p><strong>お支払い方法:</strong> {payment_method}</p>
                    </div>
                    
                    <div class="section-divider">ーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーー</div>
                    
                    <h3>注文内容（店舗提供分）</h3>
                    <table class="invoice-table">
                        {items_html}
                        <tr class="subtotal">
                            <td colspan="2"><strong>小計:</strong></td>
                            <td style="text-align: right;"><strong>¥{venue_subtotal:,} (税込み)</strong></td>
                        </tr>
                        <tr>
                            <td colspan="2">▼ 店舗クーポン割引</td>
                            <td style="text-align: right;">-¥{venue_coupon_discount:,}</td>
                        </tr>
                    </table>
                    
                    {service_fee_section}
                    
                    <div class="section-divider">ーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーー</div>
                    
                    <div class="total-amount">
                        <p style="margin: 0; font-size: 18px;"><strong>合計お支払い金額（税込）:</strong></p>
                        <p class="amount" style="margin: 10px 0 0 0;">¥{total_amount:,}</p>
                    </div>
                    
                    <div class="company-info">
                        <h3>発行元情報</h3>
                        <p><strong>株式会社セレンディピティ</strong></p>
                        {tax_registration}
                        <p>info@omochiapp.com</p>
                        <p>https://omochiapp.com</p>
                    </div>
                    
                    <div class="notes">
                        <h4>備考</h4>
                        <ul>
                            <li>※本領収書は、{venue_name}様の依頼に基づき、株式会社セレンディピティ（Omochi）が代理で発行したものです。</li>
                            <li>※店舗様の売上に関する項目は、店舗様側の記録にも反映されております。</li>
                            {additional_notes}
                            <li>※「店舗クーポン割引」は店舗の販促施策として提供されました。</li>
                            <li>※「Omochiクーポン適用割引」はOmochiによるキャンペーンとして適用され、Omochiが費用を負担しております。</li>
                        </ul>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Generate plain text version
        plain_content = f"""
領収書 #{invoice_number} - Omochi

領収書番号: #{invoice_number}
取引日: {order_date}
ご注文者様: {customer_name}
店舗名: {venue_name}
お支払い方法: {payment_method}

ーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーー
注文内容（店舗提供分）
"""
        
        # Add items to plain text
        for item in items:
            plain_content += f"{item.get('name', '')} × {item.get('quantity', 1)}　¥{item.get('price', 0):,} (税込み)\n"
        
        plain_content += f"""小計: ¥{venue_subtotal:,} (税込み)
▼ 店舗クーポン割引　　　　-¥{venue_coupon_discount:,}
"""
        
        if order_type == 'takeout':
            plain_content += f"""ーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーー
Omochiサービス利用料（株式会社セレンディピティ）
サービス利用料（税抜）¥{service_fee_pretax:,}
▼ Omochiクーポン適用割引: -¥{omochi_coupon_discount:,}
消費税（10%）¥{service_tax:,}　
小計（税込）: ¥{service_fee_total:,}
"""
        
        plain_content += f"""ーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーー
合計お支払い金額（税込）: ¥{total_amount:,}

発行元情報
株式会社セレンディピティ
"""
        
        if order_type == 'takeout':
            plain_content += "適格請求書発行事業者登録番号: T4010601064331\n"
        
        plain_content += """info@omochiapp.com
https://omochiapp.com

備考
※本領収書は、""" + venue_name + """様の依頼に基づき、株式会社セレンディピティ（Omochi）が代理で発行したものです。
※店舗様の売上に関する項目は、店舗様側の記録にも反映されております。
※「店舗クーポン割引」は店舗の販促施策として提供されました。
※「Omochiクーポン適用割引」はOmochiによるキャンペーンとして適用され、Omochiが費用を負担しております。
"""
        
        if order_type == 'takeout':
            plain_content += "※Omochiサービス利用料については、株式会社セレンディピティが適格請求書発行事業者として発行しております。\n"
        
        return {
            'subject': subject,
            'html_content': html_content,
            'plain_content': plain_content,
            'cc': data.get('cc', []),
            'bcc': data.get('bcc', [])
        }

# Global instance
email_template_service = EmailTemplateService()