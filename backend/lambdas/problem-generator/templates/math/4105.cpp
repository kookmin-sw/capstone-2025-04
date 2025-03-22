// BOJ - 4105 유클리드

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
 
using namespace std;
 
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    cout << fixed;
    cout.precision(3);
 
    while(1) {
        double ax, ay, bx, by, cx, cy, dx, dy, ex, ey, fx, fy;
        cin >> ax >> ay >> bx >> by >> cx >> cy >> dx >> dy >> ex >> ey >> fx >> fy;

        if(ax == 0.0 && ay == 0.0 && bx == 0.0 && by == 0.0 && cx == 0.0 && cy == 0.0 && dx == 0.0 && dy == 0.0 && ex == 0.0 && ey == 0.0 && dx == 0.0 && dy == 0.0 && ex == 0.0 && ey == 0.0 && fx == 0.0 && fy == 0.0) return 0;

        // 삼각형 DEF의 넓이
        double tri_area = 0.5 * abs(
            (dx * ey + ex * fy + fx * dy) -
            (ex * dy + fx * ey + dx * fy)
        );

        double area = abs(
            (ax * by + bx * cy + cx * ay) -
            (bx * ay + cx * by + ax * cy)
        );

        double vecX = cx - ax, vecY = cy - ay;
        double rate = tri_area / area; // 어차피 C점만 움직이니까

        vecX *= rate, vecY *= rate;
        cout << (bx + vecX) << ' ' << (by + vecY) << ' ' << (ax + vecX) << ' ' << (ay + vecY) << '\n';
    }
}