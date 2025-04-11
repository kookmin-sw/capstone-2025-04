// BOJ - 2531 회전 초밥

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define ll long long int
 
using namespace std;
 
ll plate[30001], chk[3001];
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    // n: 접시 수, d: 초밥 최대 가짓수
    // k: 먹을 연속 접시 수, c: 쿠폰 번호
    ll n, d, k, c; cin >> n >> d >> k >> c;
    loop(i, 0, n - 1) cin >> plate[i];

    ll j = 0, dupl = 0, coup = 0, ans = 0;
    loop(i, 0, n - 1) { // [i, j)
        while(j - i < k) {
            chk[plate[j % n]]++; // 결국은 나온 횟수를 카운트하는 역할임을 짐작
            if(chk[plate[j % n]] >= 2) dupl++; // 동일한 스시일 경우

            if(plate[j % n] == c) coup++; // 쿠폰을 쓸 수 있는 경우
            j++;
        }

        ans = max(ans, k - dupl + !coup); // coup == 0 이었다는 것은 추가로 무료 제공해야함.

        // 앞에서 한칸 땡기기
        chk[plate[i % n]]--;
        if(chk[plate[i % n]] >= 1) dupl--; // 0이면 더이상 중복이 아니기 때문
        if(plate[i % n] == c) coup--; // 쿠폰을 쓸 수 있는 경우에서 하나 뺴야함.
    }

    cout << ans << '\n';
}