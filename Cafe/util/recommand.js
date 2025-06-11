function recommandCafe(cafeData, userBrandPreferences, sort) {
  // 1️.카페 이름만 추출
  const recommendedBrands = [...new Set(cafeData.map(cafe => cafe.cafe))];

  // 2️.사용자 선호도 순서에서 실제 포함된 브랜드만 걸러내고 순서 유지
  const filteredBrandPreferences = userBrandPreferences
    .filter(brand => recommendedBrands.includes(brand));

  // 3️.차등 점수 계산
  let brandScores = {};
  const maxScore = 1.0;
  const minScore = 0.1;
  const steps = (maxScore - minScore) / (filteredBrandPreferences.length - 1 || 1);

  filteredBrandPreferences.forEach((brand, index) => {
    brandScores[brand] = maxScore - (steps * index);
  });

  // 정렬 기준별 가중치 설정
  let congestionWeight = 1;
  let distanceWeight = 1;
  let brandWeight = 1;

  if (sort === "congestion") {
    congestionWeight = 2;
    distanceWeight = 1;
    brandWeight = 0.5;
  } else if (sort === "distance") {
    congestionWeight = 1;
    distanceWeight = 2;
    brandWeight = 0.5;
  } else if (sort === "brand") {
    congestionWeight = 1;
    distanceWeight = 0.5;
    brandWeight = 2;
  } else {
    // 혼합순(기본)
    congestionWeight = 1;
    distanceWeight = 1;
    brandWeight = 0.3;
  }

  // 4️.최종 점수 계산: 최종 객체에 finalScore만 추가
  const scoredCafes = cafeData.map(cafe => {
    // 거리 점수
    let distanceScore = 1;
    if (cafe.distance <= 20) distanceScore = 10;
    else if (cafe.distance <= 30) distanceScore = 7;
    else if (cafe.distance <= 40) distanceScore = 5;
    else if (cafe.distance <= 60) distanceScore = 3;

    // 혼잡도 점수
    let congestionScore = 10 - ( cafe.congestionRate * 10 );

    // 브랜드 점수
    let brandScore = brandScores[cafe.cafe] || 0;

    // 최종 점수
    let finalScore = (congestionScore * congestionWeight) + (distanceScore * distanceWeight) + (brandScore * brandWeight * 10);

    // 기존 데이터에 finalScore만 추가해서 반환
    return {
      ...cafe,
      finalScore: parseFloat(finalScore.toFixed(2)) // 소수점 2자리
    };
  });

  // 5️.최종 정렬 (내림차순)
  scoredCafes.sort((a, b) => b.finalScore - a.finalScore);

  return scoredCafes;
}

module.exports = { recommandCafe };