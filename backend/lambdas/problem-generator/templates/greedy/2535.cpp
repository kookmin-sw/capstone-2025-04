// BOJ - 2535 아시아 정보올림피아드

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)

using namespace std;

struct p {
    int a, b, v;
};
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int n, maxc = 0; cin >> n; vector<p> arr;
    LOOP(i, 0, n) {
        int a, b, v; cin >> a >> b >> v; maxc = max(maxc, a);
        arr.push_back({a, b, v});
    }
    sort(arr.begin(), arr.end(), [](p p1, p p2) {
        return p1.v < p2.v;
    });

    int prize = 1, medal[maxc + 1] = {0, };
    while(1) {
        if(prize == 4) break;
        p t = arr[arr.size() - 1]; arr.pop_back();
        if(medal[t.a] >= 2) continue;
        cout << t.a << ' ' << t.b << '\n';
        prize++; medal[t.a]++;
    }

}