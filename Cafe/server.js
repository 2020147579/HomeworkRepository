const express = require("express");
const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");
//sqlite
const sqlite3 = require("sqlite3");
const sqlite = require("sqlite");
const { calculateCongestion } = require("./util/congestion.js");
const { recommandCafe } = require("./util/recommand");

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.static("public")); // 정적 파일 서빙 (index.html)

app.get("/congestion", (req, res) => {
    //query에 시간, 카페 이름의 존재 확인
    const { datetime, cafeName } = req.query;
    if (!datetime || !cafeName) {
        return res.status(400).json({ error: "Missing datetime or cafeName" });
    }

    //시간을 Date 객체로 변환
    const target = new Date(datetime);
    if (isNaN(target.getTime())) {
        return res.status(400).json({ error: "Invalid datetime format" });
    }

    // cafelist.json에서 해당 카페 정보 찾기
    let cafeList;
    try {
        cafeList = JSON.parse(fs.readFileSync("./data/cafelist.json", "utf-8"));
    } catch (error) {
        console.error("Error reading cafelist.json:", error);
        return res.status(500).json({ error: "Error reading cafe list." });
    }
    const cafeInfo = cafeList[cafeName];
    if (!cafeInfo) {
        return res.status(404).json({ error: "Cafe not found" });
    }

    // 카페 정보 다른 형식으로 저장?
    const { max_seats: M, data: relativePath, name: actualCafeName } = cafeInfo;
    const filePath = path.join(__dirname, "data", path.basename(relativePath));

    // 결제 데이터 존재 확인
    if (!fs.existsSync(filePath)) {
        console.error(`Data file not found: ${filePath}`);
        return res.status(404).json({ error: "Cafe data file not found" });
    }

    // 엑셀 데이터 로딩
    const wb = xlsx.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(ws);

    let closest = null;
    let minDiff = Infinity;

    // 타겟 시간 포멧 바꿈
    const targetDate = target.toISOString().split('T')[0];

    data.forEach(row => {
        if (row["Date"] === undefined || row["Hour"] === undefined || row["Minute"] === undefined) {
            console.warn("Skipping row with missing date/time fields:", row);
            return;
        }

        // Ensure proper date and time formatting
        const hours = row["Hour"].toString().padStart(2, '0');
        const minutes = row["Minute"].toString().padStart(2, '0');
        const dateStr = `${row["Date"]}T${hours}:${minutes}:00`;
        
        // 결제 데이터에서 현 시각과 가장 가까운 데이터 찾음
        try {
            const entryDate = new Date(dateStr);
            if (!isNaN(entryDate.getTime())) {
                const diff = Math.abs(target.getTime() - entryDate.getTime());
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = row;
                }
            }
        } catch (error) {
            console.warn(`Invalid date format for row:`, row);
        }
    });

    //없으면 없다고 반환
    if (!closest) {
        return res.status(404).json({ 
            error: "No matching time found",
            requestedTime: datetime,
            targetDate: targetDate
        });
    }

    //그 시각에 남은 좌석수 받아 계산하라고 넘겨줌
    const remainingSeats = parseInt(closest["LeftSeats"], 10);
    const a = parseFloat((Math.random() * (1.1 - 0.9) + 0.9).toFixed(2));
    //확인용 console.log
    console.log("M:", M, "remainingSeats:", remainingSeats, "a:", a);
    const congestion = calculateCongestion(M, remainingSeats, a);

    //결과 반환
    return res.json({
        cafe: actualCafeName,
        requestedTime: datetime,
        matchedTime: `${closest["Date"]} ${closest["Hour"].toString().padStart(2, '0')}:${closest["Minute"].toString().padStart(2, '0')}`,
        remainingSeats,
        congestion
    });
});

//호스팅 되면 메세지
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

async function getDBConnection() {
    const db = await sqlite.open({
        filename: path.join(__dirname, "data", "cafe.db"),
        driver: sqlite3.Database
    });

    return db;
}

app.get("/getBrand", async (req, res) => {
  try {
    let id = req.query.id;
    let pwd = req.query.pwd;

    let db = await getDBConnection();
    let query = "SELECT brand FROM user WHERE id=? AND pwd=?";
    let rows = await db.all(query, [id, pwd]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // brand 문자열을 쉼표 기준으로 나눈 배열로 변환
    let brandString = rows[0].brand || "";
    let brandArray = brandString.split(",").map(item => item.trim());

    console.log(brandArray);

    // 배열로 JSON 응답
    res.json(brandArray);
  } catch (error) {
    console.error(error);
    res.status(500).send("서버 오류 발생");
  }
});

app.use(express.json()); // JSON 요청 파싱

app.post("/recommend", async (req, res) => {
  try {
    const { cafeData, brand, sort } = req.body;

    if (!cafeData || !brand || !sort) {
      return res.status(400).json({ error: "카페 데이터, 브랜드, 정렬 기준이 필요합니다." });
    }

    // 추천 수행
    const recommended = recommandCafe(cafeData, brand, sort);

    console.log(recommended);

    res.json(recommended);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "추천 중 오류 발생" });
  }
});