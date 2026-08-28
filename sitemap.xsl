<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9">

  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Sitemap — Father Figure Nutrition</title>
        <style>
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

          body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #0a0a0a;
            color: #e5e5e5;
            min-height: 100vh;
            padding: 2rem 1rem;
          }

          .container {
            max-width: 860px;
            margin: 0 auto;
          }

          header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 2.5rem;
            padding-bottom: 1.5rem;
            border-bottom: 2px solid #c9a84c;
          }

          header h1 {
            font-size: 1.5rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #c9a84c;
          }

          header p {
            font-size: 0.8rem;
            color: #888;
            margin-top: 0.2rem;
            text-transform: uppercase;
            letter-spacing: 0.15em;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9rem;
          }

          thead tr {
            background: #1a1a1a;
            border-bottom: 1px solid #333;
          }

          thead th {
            text-align: left;
            padding: 0.75rem 1rem;
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: #c9a84c;
            font-weight: 700;
          }

          tbody tr {
            border-bottom: 1px solid #1e1e1e;
            transition: background 0.15s;
          }

          tbody tr:hover { background: #141414; }

          tbody td {
            padding: 0.85rem 1rem;
            vertical-align: middle;
          }

          a {
            color: #a0b4ff;
            text-decoration: none;
            word-break: break-all;
          }

          a:hover { text-decoration: underline; color: #c9a84c; }

          .badge {
            display: inline-block;
            padding: 0.2rem 0.6rem;
            border-radius: 999px;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .badge-high   { background: #1a3a1a; color: #4ade80; border: 1px solid #166534; }
          .badge-medium { background: #2a2a10; color: #facc15; border: 1px solid #713f12; }
          .badge-low    { background: #1e1e1e; color: #888;    border: 1px solid #333; }

          footer {
            margin-top: 2.5rem;
            padding-top: 1.5rem;
            border-top: 1px solid #222;
            font-size: 0.75rem;
            color: #555;
            text-align: center;
          }

          footer a { color: #c9a84c; }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <div>
              <h1>Father Figure Nutrition</h1>
              <p>Sitemap — <xsl:value-of select="count(sm:urlset/sm:url)"/> URLs indexed</p>
            </div>
          </header>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>URL</th>
                <th>Change Frequency</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sm:urlset/sm:url">
                <tr>
                  <td style="color:#555; width:2.5rem;">
                    <xsl:value-of select="position()"/>
                  </td>
                  <td>
                    <a href="{sm:loc}"><xsl:value-of select="sm:loc"/></a>
                  </td>
                  <td style="color:#888; text-transform:capitalize;">
                    <xsl:value-of select="sm:changefreq"/>
                  </td>
                  <td>
                    <xsl:choose>
                      <xsl:when test="sm:priority >= 0.9">
                        <span class="badge badge-high"><xsl:value-of select="sm:priority"/></span>
                      </xsl:when>
                      <xsl:when test="sm:priority >= 0.5">
                        <span class="badge badge-medium"><xsl:value-of select="sm:priority"/></span>
                      </xsl:when>
                      <xsl:otherwise>
                        <span class="badge badge-low"><xsl:value-of select="sm:priority"/></span>
                      </xsl:otherwise>
                    </xsl:choose>
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>

          <footer>
            <p>&#169; <xsl:value-of select="substring(string(current-dateTime()), 1, 4)"/> Father Figure Nutrition ·
              <a href="https://figurefuel.fit">figurefuel.fit</a>
            </p>
          </footer>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
