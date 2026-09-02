# 그래핀 스마트 쿠커 시뮬레이터 개발 기록

minMax 조리기기(그래핀 스마트 쿠커) DT 프롬프트 작업 정리본입니다. `1caaa1d5-minMax_DT_Prompt_____________.docx` 문서에서 옮겨온 원본 개발 로그이며, 현재 `index.html`(V7.8.1)에 반영되어 있는 내용의 근거 자료입니다.

## 1. 초기 진입 및 옵션 구조 변경 (v6.0 ~ v6.2)

- 선택 옵션 변경: Meat, Seafood/Poultry, Grain에서 Beef, Pork, Chicken, Seafood, Veges, Grains의 6개 진입점으로 변경
- UX 통일: 초기 진입 후 선택 항목들은 5개 옵션으로 구조화
- 동작 선택 상세
  - Beef: 부위(Tenderloin/Striploin/Ribeye/Sirloin/Etc.) → 굽기(Rare/Medium-Rare/Medium/Medium-Well/Well-done)
  - Pork: 부위(Collar/Loin/Pork Rib/Pork Belly/Etc.) → 굽기(Medium/Medium-Well/Well-done, 선택 불가 옵션 음영 처리)
  - Chicken: 부위(Breast/Thigh/Wings/Spatchcoak/Etc.) → 굽기(바로 조리, 선택 불가 옵션 음영 처리)
  - Seafood: 부위(White Fish/Oily Fish/Crustaceans/Mollusks/Shellfish) → 굽기(바로 조리)
  - Veges: 부위(Root/Fruit/Mushroom/Leaf/Etc.) → 굽기(바로 조리)
  - Grains: 부위(Brown Rice/White Rice/Mixed Grains/Corn/Etc.) → 굽기(바로 조리)

## 2. 테스트용 두께 입력 및 소요 시간 모니터링 추가 (260728 0930 ~ 1000)

- 두께 입력창: 왼쪽 입력창 상단에 추가. 기본값은 가운데 Auto를 유지하되, 좌우 드래그 시 0~50mm까지 1mm 단위로 테스트 선택 가능 (메뉴얼에서는 입력값을 두께 센싱값으로 활용)
- 소요 시간 모니터링: 중간 조리 창에서 재료 온도 우측에 소요 시간 모니터링 추가
- 시뮬레이션 반영: 측정된 고기의 두께 및 조리 특성에 따라 소요 시간 시뮬레이션 (예: Beef 스테이크 Tenderloin 25mm Medium-Rare 조리 시 약 20분 소요)
- Time Frame 스케일: 왼쪽 두께 입력창 하단에 x1, x5, x10, x20, x30 시간 스케일 선택 기능 추가 (조리 과정과 시간 동기화)

## 3. 동작 오류 수정 및 레스팅/가열 조건 반영 (260728 1010 ~ 1030)

- 동작 오류 수정: 좌측 입력창에서 조리 시작 시 가운데 창에서 정상 작동하도록 수정
- 조리 및 레스팅 로직: 좌측창의 예상 소요 시간만큼 가운데 창의 동작 소요 시간이 재료 온도를 감안하여 유사하게 소요되도록 반영. 조리 가열 시 재료 온도는 45도에서 중단하고 레스팅하여 57도까지 상승 후 종료
- 용어 변경: 시뮬레이터 내 "심부온도" 표현을 "재료온도"로 변경

## 4. 재료별 상세 조리 조건 및 마이너 수정 (260728 1030 ~ 1040)

| 카테고리 | 부위/종류 | 조리 목표 | 가열 중단 (Pull Temp) | 레스팅 후 (Final Temp) | 시뮬레이션 로직 및 조리 특징 |
|---|---|---|---|---|---|
| Beef | Tenderloin, Striploin, Ribeye, Sirloin | Rare | 48°C | 50°C ~ 52°C | 잔열 +2~4°C 상승 / 붉은 육즙, 매우 부드러움 |
| Beef | Tenderloin, Striploin, Ribeye, Sirloin | Medium-Rare | 51°C ~ 52°C | 54°C ~ 57°C | 잔열 +3~5°C 상승 / 업계 표준 추천 (풍미·육즙 최상) |
| Beef | Tenderloin, Striploin, Ribeye, Sirloin | Medium | 56°C ~ 57°C | 60°C ~ 63°C | 잔열 +4~6°C 상승 / 씹는 맛과 촉촉함의 균형 |
| Beef | Tenderloin, Striploin, Ribeye, Sirloin | Medium-Well | 61°C ~ 63°C | 65°C ~ 68°C | 잔열 +4~5°C 상승 / 붉은빛 사라짐, 단단한 식감 |
| Beef | Tenderloin, Striploin, Ribeye, Sirloin | Well-done | 67°C 이상 | 71°C 이상 | 잔열 +4°C+ 상승 / 속까지 완숙, 수분 손실 큼 |
| Beef | Etc. (양지, 갈비, 사태 등) | Slow / Braise | 88°C ~ 93°C | 88°C ~ 95°C | 콜라겐이 젤라틴화되어 부드러워지는 고온 장시간 구간 |
| Pork | Collar, Loin | Medium | 58°C ~ 60°C | 63°C | 잔열 +3~5°C 상승 / 최저 안전 기준, 육즙 촉촉 |
| Pork | Collar, Loin | Medium-Well | 64°C ~ 65°C | 68°C | 잔열 +3~4°C 상승 / 담백하고 적절히 익은 상태 |
| Pork | Collar, Loin | Well-done | 68°C ~ 70°C | 71°C 이상 | 잔열 +2~3°C 상승 / 바싹 익어 단단함 |
| Pork | Pork Belly, Pork Rib, Etc. | Braising / BBQ | 85°C ~ 90°C | 85°C ~ 93°C | 지방과 결합조직이 완전히 녹아내리는 구간 |
| Chicken | Breast | Optimal (Chef) | 63°C ~ 65°C | 63°C ~ 65°C | 레스팅 오버슈트 최소화 / 저온 조리 시 촉촉함 극대화 |
| Chicken | Breast | USDA Safe Standard | 74°C | 74°C | 즉시 살균 완료 안전 기준 |
| Chicken | Thigh, Wings | Well-done | 74°C ~ 80°C | 74°C ~ 80°C | 콜라겐·지방이 많아 74°C 이상에서 질기지 않고 쫄깃 |
| Chicken | Spatchcock | Dual-Zone Target | 가슴 65°C / 다리 75°C | 가슴 65°C / 다리 75°C | 부위별 두께 차이에 따른 이중 온도 조리 |
| Seafood | White Fish (대구, 가자미) | Cooked | 50°C ~ 55°C | 50°C ~ 55°C | 단백질 변성 완료, 결대로 부드럽게 갈라짐 |
| Seafood | Oily Fish (연어, 참치) | Medium-Rare | 45°C ~ 50°C | 45°C ~ 50°C | 중심부 촉촉함 및 고소한 지방 수분 유지 |
| Seafood | Oily Fish (연어, 참치) | Well-done | 55°C | 55°C | 완전히 익힘 |
| Seafood | Crustaceans (새우, 게) | Optimal | 55°C ~ 60°C | 55°C ~ 60°C | 단백질 응고로 살이 불투명해지며 탱글해짐 |
| Seafood | Mollusks (오징어, 문어) | Quick Cook | 55°C ~ 60°C | 55°C ~ 60°C | 짧은 가열로 연한 식감 유지 |
| Seafood | Mollusks (오징어, 문어) | Slow Cook | 80°C 이상 | 80°C 이상 | 콜라겐 분해를 위한 장시간 열처리 |
| Seafood | Shellfish (조개류) | Cooked | 60°C ~ 65°C | 60°C ~ 65°C | 껍데기가 열리고 알맹이가 완숙되는 시점 |
| Veges | Root (감자, 당근 등) | Soft / Cooked | 85°C ~ 90°C | 85°C ~ 90°C | 세포벽의 펙틴(Pectin) 성분이 분해되어 부드러워짐 |
| Veges | Fruit (토마토, 가지 등) | Tender | 80°C ~ 85°C | 80°C ~ 85°C | 수분 유지 및 당도 활성화, 형태 보존 |
| Veges | Mushroom (버섯류) | Cooked | 80°C ~ 85°C | 80°C ~ 85°C | 키틴 구조 유지 및 감칠맛 수분 방출 |
| Veges | Leaf (시금치, 배추 등) | Blanched / Wilted | 70°C ~ 80°C | 70°C ~ 80°C | 엽록소 파괴 방지, 숨만 살짝 죽여 아삭함 유지 |
| Grains | White Rice | Gelatinized | 95°C ~ 98°C | 95°C ~ 98°C | 전분 호화(Gelatinization) 완료 |
| Grains | Brown / Mixed Grains | Gelatinized | 98°C ~ 100°C | 98°C ~ 100°C | 외피(강층) 연화 및 속까지 완전 호화 |
| Grains | Corn | Cooked | 85°C ~ 90°C | 85°C ~ 90°C | 알갱이 내 수분 팽창 및 아삭한 식감 유지 |

마이너 수정 사항:

- [Test] 두께 지정 슬라이더 하단 0mm, 25mm 위치 오동작 수정 (동작 기준 표기 mm 위치 조정)
- [Test] 시뮬레이션 배속을 x1, x10, x20, x30, x50, x100으로 조정
- '가열차단!' 표현을 '가열중단'으로 변경 (아이콘 유지, 움직임 없이 표기만)

## 5. 한국 기준 소비 순서 정렬 및 최종 v6.6 반영 (260728 1400 ~ 1450 v6.6)

각 항목별 한국 기준 선호/소비 순서에 따른 부위 정렬 적용:

- Beef: Ribeye / Striploin / Tenderloin / Sirloin / Etc. → Rare/Medium-Rare/Medium/Medium-Well/Well-done
- Pork: Pork Belly / Collar / Pork Rib / Loin / Etc. → Medium/Medium-Well/Well-done
- Chicken: Thigh / Breast / Wings / Spatchcock / Etc. → 바로 조리
- Seafood: White Fish / Oily Fish / Mollusks / Crustaceans / Shellfish → 바로 조리
- Veges: Leaf & Stem (Asparagus/Green Onion) / Root (Potato/Sweet Potato) / Fruit (Eggplant/Zucchini) / Mushroom (King Oyster) / Etc. → 바로 조리
- Grains: White Rice / Mixed Grains / Brown Rice / Corn / Etc. → 바로 조리
