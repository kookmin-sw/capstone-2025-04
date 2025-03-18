// BOJ - 20529 가장 가까운 세 사람의 심리적 거리

// N명의 학생들의 MBTI 유형이 주어질 때, 가장 가까운 세 학생 사이의 심리적인 거리를 구해보자.

// step 1. naive 접근
// 2명씩 짝 맞춰 심리적인 거리를 구해서 표를 만든다고 생각 했을 때, (x1, y1) 를 지정하면 for문으로 1~N까지 랜덤 돌려서 최솟값구하기.
// (x1, y1) 지정 => O(N^2) * for문 => O(N) = O(N^3), 하지만 N이 ~100k 이므로 TLE 일것 같지만..

// step 2. Pigeonhole principle (비둘기집의 원리)
// MBTI의 cases는 16개 이므로, N >= 17 부터 적어도 2명이 똑같은 MBTI를 가진 경우가 한번은 생긴다.
// N >= 33 부터 적어도 3명이 똑같은 MBTI를 가진 경우가 한번은 생긴다.
// N < 33 인 경우만 NAIVE하게 쓰까주자.

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
#define MAXN 50
 
using namespace std;
 
int compare(string ss1, string ss2) {
    int res = 0;
    LOOP(i, 0, 4) res += (ss1[i] != ss2[i]);
    return res;
}
void tc() {
    string s[MAXN];

    int n, diff[MAXN][MAXN] = {0, }; cin >> n;
    loop(i, 1, n) {
        string ss; cin >> ss;
        if(n < 33) s[i] = ss;
    }

    if(n >= 33) { cout << "0\n"; return; }

    int ans = 0x7fffffff;
    loop(i, 1, n) loop(j, 1, n) loop(k, 1, n)
        if(i != j && j != k && i != k) {
            int cmp = compare(s[i], s[j]) + compare(s[j], s[k]) + compare(s[i], s[k]);
            ans = min(ans, cmp);
        }
        
    cout << ans << '\n';
    return;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    int t; cin >> t;
    while(t--) tc();
}