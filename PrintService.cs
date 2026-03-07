using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Printing;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using QRCoder;

namespace FoodExPOSWebView2.Services
{
    public static class PrintService
    {
        /// <summary>
        /// إرجاع قائمة بأسماء الطابعات المتاحة على نظام ويندوز.
        /// </summary>
        public static List<string> GetInstalledPrinters()
        {
            var printers = new List<string>();
            try
            {
                using var server = new LocalPrintServer();
                foreach (var queue in server.GetPrintQueues())
                {
                    // Return both the short queue name and the full name (e.g. network printer)
                    // so UI/debugging can see what the system actually exposes.
                    var name = (queue.Name ?? string.Empty).Trim();
                    var full = (queue.FullName ?? string.Empty).Trim();
                    if (!string.IsNullOrWhiteSpace(name))
                        printers.Add(name);
                    if (!string.IsNullOrWhiteSpace(full) && !string.Equals(full, name, StringComparison.OrdinalIgnoreCase))
                        printers.Add(full);
                }

                printers = printers
                    .Where(p => !string.IsNullOrWhiteSpace(p))
                    .Select(p => p.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(p => p, StringComparer.OrdinalIgnoreCase)
                    .ToList();
            }
            catch
            {
                // لو حصل خطأ نرجع قائمة فارغة
            }

            return printers;
        }

        /// <summary>
        /// طباعة صامتة (بدون نافذة إعدادات).
        /// </summary>
        public static Task PrintSilentAsync(string htmlContent, string? printerName, string purpose = "receipt")
        {
            return Task.Run(async () =>
            {
                try
                {
                    await PrintAsync(htmlContent, printerName, purpose);
                }
                catch (Exception ex)
                {
                    // Silent by design: log only.
                    Console.WriteLine("Print error: " + ex.Message);
                }
            });
        }

        /// <summary>
        /// طباعة على طابعة محددة (أو الافتراضية) مع تمرير الأخطاء للمستدعي.
        /// مهم: الطباعة في WPF يجب أن تعمل على STA/Dispatcher.
        /// </summary>
        public static async Task PrintAsync(string htmlContent, string? printerName, string purpose = "receipt")
        {
            if (string.IsNullOrWhiteSpace(htmlContent))
                return;

            // Prefer WPF dispatcher (STA) to avoid intermittent printing failures.
            var dispatcher = Application.Current?.Dispatcher;
            if (dispatcher != null)
            {
                if (dispatcher.CheckAccess())
                {
                    PrintAsText(htmlContent, printerName, purpose);
                }
                else
                {
                    await dispatcher.InvokeAsync(() =>
                    {
                        PrintAsText(htmlContent, printerName, purpose);
                    });
                }

                return;
            }

            // Fallback: run on current thread if Application.Current is unavailable.
            PrintAsText(htmlContent, printerName, purpose);
        }

        /// <summary>
        /// تحويل المحتوى إلى مستند للطباعة (فاتورة أو بطاقة مطبخ).
        /// </summary>
        private static void PrintAsText(string htmlContent, string? printerName, string purpose)
        {
            if (string.IsNullOrWhiteSpace(htmlContent))
                return;

            try
            {
                // 1) استخراج اللوجو من النص بصيغة [[LOGO:data-uri]]
                string? logoDataUri = null;
                var logoMatch = Regex.Match(htmlContent, @"\[\[LOGO:(.*?)\]\]");
                if (logoMatch.Success)
                {
                    // إزالة العلامة من النص حتى لا تظهر كحروف
                    htmlContent = htmlContent.Replace(logoMatch.Value, string.Empty);
                    // اللوجو يُطبع فى الفاتورة فقط، وليس بطاقة المطبخ
                    if (!string.Equals(purpose, "kitchen", StringComparison.OrdinalIgnoreCase))
                    {
                        logoDataUri = logoMatch.Groups[1].Value;
                    }
                }

                // 1.1) استخراج QR من النص بصيغة [[QR:any-text-or-url]]
                string? qrPayload = null;
                var qrMatch = Regex.Match(htmlContent, @"\[\[QR:(.*?)\]\]");
                if (qrMatch.Success)
                {
                    htmlContent = htmlContent.Replace(qrMatch.Value, string.Empty);
                    if (!string.Equals(purpose, "kitchen", StringComparison.OrdinalIgnoreCase))
                    {
                        qrPayload = qrMatch.Groups[1].Value;
                    }
                }

                // 2) تحويل المحتوى إلى نص بسيط مع الحفاظ على الـ Tabs المستخدمة للأعمدة
                string formattedText = htmlContent.Contains("<")
                    ? FormatHtmlForPrinting(htmlContent)
                    : NormalizePlainText(htmlContent);

                // Font sizing/weight:
                // - Receipt: readable, normal density
                // - Kitchen: bigger + heavier for visibility
                var isKitchen = string.Equals(purpose, "kitchen", StringComparison.OrdinalIgnoreCase);
                var baseFontSize = isKitchen ? 16 : 14;

                void DoPrint()
                {
                    var doc = new FlowDocument
                    {
                        FontFamily = new FontFamily("Arial Unicode MS, Segoe UI, Tahoma"),
                        FontSize = baseFontSize,
                        FontWeight = isKitchen ? FontWeights.ExtraBold : FontWeights.Bold,
                        PageWidth = isKitchen ? 300 : 275,
                        PagePadding = isKitchen ? new Thickness(8) : new Thickness(4, 2, 4, 2),
                        FlowDirection = FlowDirection.RightToLeft,
                        Foreground = Brushes.Black,
                        Background = Brushes.White, // خلفية بيضاء
                        TextAlignment = TextAlignment.Right, // محاذاة النص إلى اليمين
                        PageHeight = double.NaN, // ارتفاع تلقائي
                        ColumnWidth = double.NaN // عرض عمود تلقائي
                    };

                    // 3) إضافة اللوجو أعلى الفاتورة فقط
                    if (!string.IsNullOrEmpty(logoDataUri))
                    {
                        var image = CreateImageFromDataUri(logoDataUri);
                        if (image != null)
                        {
                            image.Width = 240; // تقريباً عرض الورقة ناقص الهوامش
                            image.Stretch = Stretch.Uniform;
                            image.HorizontalAlignment = HorizontalAlignment.Center;
                            image.Margin = new Thickness(0, 0, 0, 6);

                            var imgContainer = new BlockUIContainer(image)
                            {
                                TextAlignment = TextAlignment.Center,
                                Margin = new Thickness(0, 0, 0, 4)
                            };
                            doc.Blocks.Add(imgContainer);
                        }
                    }

                    // 4) جدول الأصناف أو التقارير (صفوف وأعمدة حقيقية)
                    Table? itemsTable = null;
                    TableRowGroup? rowGroup = null;
                    bool isReportTable = false;
                    int tableColumnCount = 0;

                    void FlushTable()
                    {
                        // إنهاء الجدول الحالي حتى يمكن بدء جدول جديد
                        itemsTable = null;
                        rowGroup = null;
                        isReportTable = false;
                        tableColumnCount = 0;
                    }

                    void EnsureTable(string[] firstRowParts)
                    {
                        if (itemsTable != null)
                            return;

                        // كشف ما إذا كان الجدول تقريراً (تقرير سائقين، مبيعات، إغلاق...)
                        string headerText = string.Join(" ", firstRowParts).Trim();
                        isReportTable = headerText.Contains("رقم الطلب") ||
                                        headerText.Contains("المركز") ||
                                        headerText.Contains("اسم السائق") ||
                                        headerText.Contains("طريقة الدفع") ||
                                        headerText.Contains("النوع") ||
                                        headerText.Contains("الإجمالي قبل") ||
                                        headerText.Contains("إجمالي الضريبة") ||
                                        headerText.Contains("إجمالي المصروفات");

                        itemsTable = new Table
                        {
                            CellSpacing = 0,
                            FlowDirection = FlowDirection.RightToLeft,
                            TextAlignment = TextAlignment.Right
                        };

                        int columnsCount;
                        if (isKitchen)
                        {
                            columnsCount = 2;
                        }
                        else if (isReportTable)
                        {
                            // عدد الأعمدة الفعلي من أول صف
                            columnsCount = firstRowParts.Count(p => !string.IsNullOrWhiteSpace(p));
                            if (columnsCount < 2) columnsCount = firstRowParts.Length;
                        }
                        else
                        {
                            columnsCount = 3; // Receipt: item / qty / total
                        }
                        tableColumnCount = columnsCount;

                        for (int i = 0; i < columnsCount; i++)
                        {
                            var column = new TableColumn();
                            if (isKitchen)
                            {
                                if (i == 0)
                                    column.Width = new GridLength(3, GridUnitType.Star);
                                else
                                    column.Width = new GridLength(1, GridUnitType.Star);
                            }
                            else if (isReportTable)
                            {
                                // أعمدة التقارير: العنوان يأخذ مساحة أكبر
                                if (columnsCount == 4)
                                {
                                    if (i == 0) column.Width = new GridLength(1.0, GridUnitType.Star);
                                    else if (i == 1) column.Width = new GridLength(2.5, GridUnitType.Star);
                                    else column.Width = new GridLength(1.2, GridUnitType.Star);
                                }
                                else
                                {
                                    column.Width = new GridLength(1, GridUnitType.Star);
                                }
                            }
                            else
                            {
                                if (i == 0)
                                    column.Width = new GridLength(3.5, GridUnitType.Star);
                                else if (i == 1)
                                    column.Width = new GridLength(0.7, GridUnitType.Star);
                                else
                                    column.Width = new GridLength(1.0, GridUnitType.Star);
                            }
                            itemsTable.Columns.Add(column);
                        }
                        itemsTable.Background = Brushes.White;

                        rowGroup = new TableRowGroup();
                        itemsTable.RowGroups.Add(rowGroup);

                        // نضيف الجدول فى موضعه داخل المستند
                        doc.Blocks.Add(itemsTable);
                    }

                    // 5) تقسيم النص إلى أسطر، وبعض الأسطر تتحول لصفوف جدول
                    string[] lines = formattedText.Split('\n');

                    foreach (var rawLine in lines)
                    {
                        // مهم: لا نستخدم TrimEnd مع أسطر الجداول (Tabs) حتى لا تُفقد الخلايا الفارغة
                        string line = rawLine;

                        // سطر فارغ: تجاهل الأسطر الفارغة
                        if (string.IsNullOrWhiteSpace(line))
                        {
                            // لا نضيف أسطر فارغة لتوفير الورق
                            continue;
                        }

                        // لو السطر يحتوى على Tabs اعتبره صف جدول (خلايا أفقية)
                        if (line.Contains("\t"))
                        {
                            EnsureTable(line.Split('\t'));

                            var row = new TableRow();
                            bool isHeaderRow = rowGroup != null && rowGroup.Rows.Count == 0;
                            string[] parts = line.Split('\t');
                            int colIndex = 0;

                            foreach (var partRaw in parts)
                            {
                                string part = partRaw.Trim();

                                // في بطاقة المطبخ، تجاهل الأعمدة الفارغة أو غير المرغوب فيها
                                bool shouldSkipColumn = false;
                                if (isKitchen)
                                {
                                    // في المطبخ، أظهر فقط اسم الصنف والكمية
                                    if (colIndex > 1 && string.IsNullOrEmpty(part))
                                    {
                                        shouldSkipColumn = true;
                                    }
                                    // إخفاء السعر والإجمالي في بطاقة المطبخ
                                    else if (colIndex > 1)
                                    {
                                        shouldSkipColumn = true;
                                    }
                                }
                                else
                                {
                                    // Receipt rows often come as 4 columns: item, qty, price, total.
                                    // Remove the price column (index 2) while keeping total.
                                    // لا نحذف أعمدة في جداول التقارير
                                    if (!isReportTable && parts.Length >= 4 && colIndex == 2)
                                    {
                                        shouldSkipColumn = true;
                                    }
                                }

                                if (part.Length == 0 && !shouldSkipColumn)
                                {
                                    // إضافة خلية فارغة للحفاظ على تخطيط الجدول
                                    var emptyCell = new TableCell(new Paragraph(new Run("")))
                                    {
                                        Padding = new Thickness(2, 0, 2, 0),
                                        Background = Brushes.White,
                                        FlowDirection = FlowDirection.RightToLeft
                                    };
                                    row.Cells.Add(emptyCell);
                                    colIndex++;
                                    continue;
                                }

                                if (shouldSkipColumn)
                                {
                                    colIndex++;
                                    continue;
                                }

                                // تحديد محاذاة النص حسب نوع المحتوى
                                TextAlignment cellAlignment;
                                if (colIndex == 0)
                                {
                                    // العمود الأول (اسم الصنف) - محاذاة يمين
                                    cellAlignment = TextAlignment.Right;
                                }
                                else
                                {
                                    // الأعمدة الأخرى (أرقام) - محاذاة وسط
                                    cellAlignment = TextAlignment.Center;
                                }

                                // تحضير النص للعرض الصحيح
                                string displayText = PrepareTextForArabicPrinting(part, colIndex > 0);

                                // إعدادات خاصة للعمود الأول (اسم الصنف)
                                var cellParagraph = new Paragraph(new Run(displayText))
                                {
                                    Margin = new Thickness(0),
                                    TextAlignment = cellAlignment,
                                    FontWeight = FontWeights.Bold,
                                    Foreground = Brushes.Black,
                                    Background = Brushes.White,
                                    FlowDirection = FlowDirection.RightToLeft
                                };

                                if (isHeaderRow)
                                {
                                    cellParagraph.FontWeight = FontWeights.ExtraBold;
                                    cellParagraph.TextAlignment = TextAlignment.Center;
                                }

                                // في بطاقة المطبخ، جعل اسم الصنف أكبر وأوضح
                                if (isKitchen && colIndex == 0)
                                {
                                    // Item name: biggest + boldest
                                    cellParagraph.FontSize = baseFontSize + 2;
                                    cellParagraph.FontWeight = FontWeights.ExtraBold;
                                }

                                var cell = new TableCell(cellParagraph)
                                {
                                    Padding = isKitchen ? new Thickness(4, 2, 4, 2) : new Thickness(2, 1, 2, 1),
                                    Background = isHeaderRow ? Brushes.Gainsboro : Brushes.White,
                                    FlowDirection = FlowDirection.RightToLeft,
                                    TextAlignment = isHeaderRow ? TextAlignment.Center : cellAlignment,
                                    BorderBrush = Brushes.Black,
                                    BorderThickness = new Thickness(0.75)
                                };

                                row.Cells.Add(cell);
                                colIndex++;
                            }

                            rowGroup?.Rows.Add(row);
                        }
                        else
                        {
                            // سطر بدون Tabs بعد جدول = الجدول انتهى، نبدأ جدول جديد لو جاء
                            if (itemsTable != null)
                                FlushTable();

                            // تحضير النص للعرض الصحيح
                            string displayText = PrepareTextForArabicPrinting(line.TrimEnd());

                            // أى سطر لا يحتوى Tabs يطبع كفقرة عادية (رأسية)
                            var paragraph = new Paragraph(new Run(displayText))
                            {
                                Margin = new Thickness(0, 0, 0, 0),
                                LineHeight = baseFontSize + 2,
                                TextAlignment = TextAlignment.Right,
                                FontWeight = FontWeights.Bold, // خط عريض
                                Foreground = Brushes.Black,
                                Background = Brushes.White,
                                FlowDirection = FlowDirection.RightToLeft
                            };

                            // عناوين بين [ ] إن وجدت
                            if (line.StartsWith("[") && line.EndsWith("]"))
                            {
                                paragraph.FontWeight = FontWeights.ExtraBold;
                                paragraph.FontSize = baseFontSize + 1;
                                paragraph.TextAlignment = TextAlignment.Center;
                            }

                            doc.Blocks.Add(paragraph);
                        }
                    }

                    // 5.1) إضافة QRCode (موقع العميل) فى الفاتورة فقط
                    if (!string.IsNullOrWhiteSpace(qrPayload) && !string.Equals(purpose, "kitchen", StringComparison.OrdinalIgnoreCase))
                    {
                        doc.Blocks.Add(new Paragraph(new Run("------------------------------------------"))
                        {
                            Margin = new Thickness(0),
                            TextAlignment = TextAlignment.Center,
                            FontWeight = FontWeights.Bold,
                            Foreground = Brushes.Black,
                            Background = Brushes.White,
                            FlowDirection = FlowDirection.RightToLeft
                        });

                        doc.Blocks.Add(new Paragraph(new Run("QR لموقع العميل"))
                        {
                            Margin = new Thickness(0, 4, 0, 4),
                            TextAlignment = TextAlignment.Center,
                            FontWeight = FontWeights.ExtraBold,
                            FontSize = baseFontSize + 1,
                            Foreground = Brushes.Black,
                            Background = Brushes.White,
                            FlowDirection = FlowDirection.RightToLeft
                        });

                        var qrImage = CreateQrImageFromText(qrPayload);
                        if (qrImage != null)
                        {
                            qrImage.Width = 180;
                            qrImage.Height = 180;
                            qrImage.Stretch = Stretch.Uniform;
                            qrImage.HorizontalAlignment = HorizontalAlignment.Center;
                            qrImage.Margin = new Thickness(0, 0, 0, 6);

                            var qrContainer = new BlockUIContainer(qrImage)
                            {
                                TextAlignment = TextAlignment.Center,
                                Margin = new Thickness(0, 0, 0, 4)
                            };
                            doc.Blocks.Add(qrContainer);
                        }
                    }

                    // 6) إرسال المستند للطباعة
                    var pd = new PrintDialog();

                    if (!string.IsNullOrWhiteSpace(printerName))
                    {
                        try
                        {
                            using var server = new LocalPrintServer();
                            var requested = printerName.Trim();
                            var queue = TryResolveQueue(server, requested);
                            if (queue != null)
                            {
                                pd.PrintQueue = queue;
                            }
                            else
                            {
                                // IMPORTANT: Do NOT fall back to default printer when a printer name is explicitly provided.
                                // This prevents kitchen tickets from accidentally printing on the invoice printer.
                                string availableMsg = string.Empty;
                                try
                                {
                                    var available = server.GetPrintQueues()
                                        .Cast<PrintQueue>()
                                        .Select(q => new { Name = (q.Name ?? "").Trim(), FullName = (q.FullName ?? "").Trim() })
                                        .Where(x => !string.IsNullOrWhiteSpace(x.Name) || !string.IsNullOrWhiteSpace(x.FullName))
                                        .Take(12)
                                        .Select(x => string.IsNullOrWhiteSpace(x.FullName) || string.Equals(x.FullName, x.Name, StringComparison.OrdinalIgnoreCase)
                                            ? x.Name
                                            : $"{x.Name} | {x.FullName}")
                                        .ToArray();

                                    if (available.Length > 0)
                                        availableMsg = " Available printers (sample): " + string.Join("; ", available);
                                }
                                catch
                                {
                                    // ignore
                                }

                                throw new Exception($"Requested printer not found: '{requested}'." + availableMsg);
                            }
                        }
                        catch
                        {
                            // Re-throw so the caller can handle/diagnose.
                            throw;
                        }
                    }

                    // إعداد الطباعة من اليمين إلى اليسار
                    if (pd.PrintQueue != null)
                    {
                        try
                        {
                            var printTicket = pd.PrintTicket;
                            if (printTicket != null)
                            {
                                // تعيين اتجاه الصفحة واللغة العربية
                                printTicket.PageOrientation = System.Printing.PageOrientation.Portrait;
                            }
                        }
                        catch
                        {
                            // تجاهل الأخطاء في إعداد التذكرة
                        }
                    }

                    pd.PrintDocument(((IDocumentPaginatorSource)doc).DocumentPaginator, purpose);
                }

                // تنفيذ على UI Thread
                if (Application.Current != null && !Application.Current.Dispatcher.CheckAccess())
                    Application.Current.Dispatcher.Invoke(DoPrint);
                else
                    DoPrint();
            }
            catch (Exception ex)
            {
                Console.WriteLine("PrintAsText error: " + ex.Message);
                throw;
            }
        }

        private static PrintQueue? TryResolveQueue(LocalPrintServer server, string requestedPrinter)
        {
            if (string.IsNullOrWhiteSpace(requestedPrinter))
                return null;

            var requested = requestedPrinter.Trim();
            PrintQueue[] queues;
            try
            {
                queues = server.GetPrintQueues().Cast<PrintQueue>().ToArray();
            }
            catch
            {
                return null;
            }

            // 1) Exact match by FullName or Name (case-insensitive)
            foreach (var q in queues)
            {
                var name = (q.Name ?? string.Empty).Trim();
                var full = (q.FullName ?? string.Empty).Trim();
                if (string.Equals(name, requested, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(full, requested, StringComparison.OrdinalIgnoreCase))
                {
                    return q;
                }
            }

            // 2) If user provides short name (e.g. foul), match network full name (e.g. \\SERVER\foul)
            foreach (var q in queues)
            {
                var full = (q.FullName ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(full)) continue;
                if (full.EndsWith("\\" + requested, StringComparison.OrdinalIgnoreCase))
                    return q;
            }

            return null;
        }

        /// <summary>
        /// تنظيف نص عادى (بدون HTML) مع الحفاظ على الـ Tabs.
        /// </summary>
        private static string NormalizePlainText(string text)
        {
            text = text.Replace("\r", string.Empty);
            var lines = text.Split('\n');
            var sb = new StringBuilder();

            foreach (var raw in lines)
            {
                var line = raw.TrimEnd();
                if (sb.Length > 0)
                    sb.Append('\n');
                sb.Append(line);
            }

            return sb.ToString();
        }

        /// <summary>
        /// تبسيط HTML إلى نص مع تحويل خلايا الجدول إلى Tabs (لإنشاء أعمدة).
        /// </summary>
        private static string FormatHtmlForPrinting(string html)
        {
            if (string.IsNullOrWhiteSpace(html))
                return string.Empty;

            var result = html;

            // إزالة DOCTYPE والرأس والسكربتات والأنماط
            result = Regex.Replace(result, @"<!DOCTYPE[^>]*>", string.Empty, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"<head[^>]*>.*?</head>", string.Empty,
                                   RegexOptions.IgnoreCase | RegexOptions.Singleline);
            result = Regex.Replace(result, @"<script[^>]*>.*?</script>", string.Empty,
                                   RegexOptions.IgnoreCase | RegexOptions.Singleline);
            result = Regex.Replace(result, @"<style[^>]*>.*?</style>", string.Empty,
                                   RegexOptions.IgnoreCase | RegexOptions.Singleline);

            // BR و HR
            result = Regex.Replace(result, @"<br\s*/?>", "\n", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"<hr[^>]*>", "\n------------------------------------------\n",
                                   RegexOptions.IgnoreCase);

            // تجميع خلايا الجدول: إزالة المسافات والأسطر الجديدة بين وسوم الجدول
            // حتى تبقى كل خلايا الصف على سطر واحد بعد التحويل
            result = Regex.Replace(result, @"</t([dh])>\s*<t", "</t$1><t", RegexOptions.IgnoreCase | RegexOptions.Singleline);
            result = Regex.Replace(result, @"</t([dh])>\s*</tr>", "</t$1></tr>", RegexOptions.IgnoreCase | RegexOptions.Singleline);
            result = Regex.Replace(result, @"<tr([^>]*)>\s*<t", "<tr$1><t", RegexOptions.IgnoreCase | RegexOptions.Singleline);

            // صفوف وجدوال: كل خلية = Tab ، وكل صف = سطر جديد
            result = Regex.Replace(result, @"</tr>", "\n", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"<tr[^>]*>", string.Empty, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"</t[dh]>", "\t", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"<t[dh][^>]*>", string.Empty, RegexOptions.IgnoreCase);

            // عناصر بلوكية كبيرة -> أسطر جديدة
            result = Regex.Replace(result, @"</?(div|p|section|article|header|footer|h[1-6])[^>]*>",
                                   "\n", RegexOptions.IgnoreCase);

            // إزالة أى وسوم أخرى
            result = Regex.Replace(result, @"<[^>]+>", string.Empty, RegexOptions.Singleline);

            // تنظيف الأسطر الزائدة
            var lines = result.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
            var sb = new StringBuilder();

            foreach (var raw in lines)
            {
                var line = raw.TrimEnd();
                if (sb.Length > 0)
                    sb.Append('\n');
                sb.Append(line);
            }

            return sb.ToString();
        }

        /// <summary>
        /// تحويل النص لدعم اتجاه عرض أفضل للنصوص العربية والأرقام
        /// </summary>
        private static string PrepareTextForArabicPrinting(string text, bool isNumericColumn = false)
        {
            if (string.IsNullOrEmpty(text))
                return text;

            // للأعمدة الرقمية، نضمن أن الأرقام تُعرض بشكل صحيح
            if (isNumericColumn)
            {
                // تحويل الأرقام الإنجليزية للعربية إذا لزم الأمر
                // text = ConvertToArabicNumerals(text);

                // إضافة علامة اتجاه النص من اليمين إلى اليسار للأرقام
                return "\u202D" + text + "\u202C";
            }

            // للنصوص العربية، نضيف علامات اتجاه النص وإضافة مسافات للنصوص الطويلة
            string processedText = text;

            // إضافة فواصل ناعمة للنصوص الطويلة لتسهيل التقسيم
            if (processedText.Length > 25)
            {
                // إضافة فاصل ناعم بعد كل مسافة لتسهيل التقسيم
                processedText = processedText.Replace(" ", " \u00AD");
            }

            return "\u202E" + processedText + "\u202C";
        }

        /// <summary>
        /// إنشاء عنصر Image من data-uri (base64) لاستخدامه فى رأس الفاتورة.
        /// </summary>
        private static System.Windows.Controls.Image? CreateImageFromDataUri(string dataUri)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(dataUri))
                    return null;

                dataUri = dataUri.Trim();

                int commaIndex = dataUri.IndexOf(',');
                string base64Data;

                // يدعم:
                // - data:image/png;base64,AAAA...
                // - AAAA... (base64 فقط بدون prefix)
                if (commaIndex >= 0)
                {
                    base64Data = dataUri[(commaIndex + 1)..];
                }
                else
                {
                    base64Data = dataUri;
                }

                base64Data = base64Data
                    .Trim()
                    .Replace(" ", string.Empty)
                    .Replace("\r", string.Empty)
                    .Replace("\n", string.Empty);

                byte[] bytes = Convert.FromBase64String(base64Data);

                using var ms = new MemoryStream(bytes);
                var bitmap = new BitmapImage();
                bitmap.BeginInit();
                bitmap.CacheOption = BitmapCacheOption.OnLoad;
                bitmap.StreamSource = ms;
                bitmap.EndInit();
                bitmap.Freeze();

                var image = new System.Windows.Controls.Image
                {
                    Source = bitmap
                };

                return image;
            }
            catch
            {
                return null;
            }
        }

        private static System.Windows.Controls.Image? CreateQrImageFromText(string text)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(text))
                    return null;

                using var generator = new QRCodeGenerator();
                using var data = generator.CreateQrCode(text.Trim(), QRCodeGenerator.ECCLevel.Q);
                var qr = new PngByteQRCode(data);
                // حجم مناسب لطباعة حرارية
                var bytes = qr.GetGraphic(12);

                using var ms = new MemoryStream(bytes);
                var bitmap = new BitmapImage();
                bitmap.BeginInit();
                bitmap.CacheOption = BitmapCacheOption.OnLoad;
                bitmap.StreamSource = ms;
                bitmap.EndInit();
                bitmap.Freeze();

                return new System.Windows.Controls.Image { Source = bitmap };
            }
            catch
            {
                return null;
            }
        }
    }
}
